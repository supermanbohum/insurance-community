-- =========================================================
-- 0053_admin_credit_grant_visitor_community_audit.sql
-- 관리자 신규 기능 4종:
--  1) 열람권 지급 - 기존 admin_adjust_planner_market_credits RPC는 그대로 두고
--     audit_logs에도 함께 기록하도록만 보강한다(기존 동작/시그니처 변경 없음).
--  2) 방문자수 관리자 보정 - site_visit_adjustments(하루 1행, upsert)를 신설하고
--     get_today_site_traffic_stats()의 visitor_count에 그 값을 더한다 - 홈/관리자가
--     쓰는 값이 자동으로 보정 반영된 "최종 표시 방문자"가 된다.
--  3) 커뮤니티 관리 - 게시글/댓글 상태 변경, 공지/베스트 토글, 신고 처리, 회원 차단
--     RPC를 신설한다(이 기능들은 지금까지 RPC 자체가 없었다).
--  4) 관리자 작업 로그 - 위 신규 RPC 전부가 audit_logs에 기록한다.
-- =========================================================

-- ---------------------------------------------------------
-- A. 열람권 지급 - audit_logs 기록 추가(기존 시그니처/리턴/검증 로직 동일)
-- ---------------------------------------------------------
create or replace function public.admin_adjust_planner_market_credits(
  p_ga_company_id uuid,
  p_delta int,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_current_balance int;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_delta = 0 then
    raise exception 'INVALID_DELTA';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  select coalesce(balance, 0) into v_current_balance
  from public.planner_market_credit_balances where ga_company_id = p_ga_company_id;

  if coalesce(v_current_balance, 0) + p_delta < 0 then
    raise exception 'BALANCE_WOULD_GO_NEGATIVE';
  end if;

  insert into public.planner_market_credit_balances (ga_company_id, balance, updated_at)
  values (p_ga_company_id, greatest(p_delta, 0), now())
  on conflict (ga_company_id) do update
    set balance = public.planner_market_credit_balances.balance + p_delta, updated_at = now();

  insert into public.planner_market_credit_adjustments (ga_company_id, delta, reason, adjusted_by_admin_id)
  values (p_ga_company_id, p_delta, trim(p_reason), v_admin_id);

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, after_value)
  values (
    v_admin_id, 'planner_market_credit', p_ga_company_id,
    case when p_delta > 0 then 'credit_grant' else 'credit_deduct' end,
    trim(p_reason),
    jsonb_build_object('delta', p_delta, 'balance_after', coalesce(v_current_balance, 0) + p_delta)
  );
end;
$$;

-- ---------------------------------------------------------
-- B. 방문자수 관리자 보정
-- ---------------------------------------------------------
create table if not exists public.site_visit_adjustments (
  adjustment_date date primary key,
  delta int not null default 0,
  reason text,
  adjusted_by_admin_id uuid references public.admin_users(id),
  updated_at timestamptz not null default now()
);
-- 정책 없음 = service role(관리자) 전용. 쓰기는 아래 RPC를 통해서만.
alter table public.site_visit_adjustments enable row level security;

create or replace function public.admin_set_visitor_adjustment(p_delta int, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  insert into public.site_visit_adjustments (adjustment_date, delta, reason, adjusted_by_admin_id, updated_at)
  values (v_today, p_delta, nullif(trim(coalesce(p_reason, '')), ''), v_admin_id, now())
  on conflict (adjustment_date) do update
    set delta = excluded.delta, reason = excluded.reason,
        adjusted_by_admin_id = excluded.adjusted_by_admin_id, updated_at = now();

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, after_value)
  values (v_admin_id, 'site_visit_adjustment', v_admin_id, 'visitor_adjustment_set',
    nullif(trim(coalesce(p_reason, '')), ''), jsonb_build_object('date', v_today, 'delta', p_delta));
end;
$$;

-- 관리자 화면의 "실제/보정/최종표시" 3분할 표시 전용 - 집계값만 반환.
create or replace function public.get_today_visitor_breakdown()
returns table (real_count bigint, adjustment int, display_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(distinct anonymous_profile_id) from public.site_visits
      where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    coalesce((select delta from public.site_visit_adjustments
      where adjustment_date = (now() at time zone 'Asia/Seoul')::date), 0),
    (select count(distinct anonymous_profile_id) from public.site_visits
      where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
      + coalesce((select delta from public.site_visit_adjustments
      where adjustment_date = (now() at time zone 'Asia/Seoul')::date), 0);
$$;

-- 홈/관리자가 공통으로 쓰는 visitor_count에 보정값을 더한다 - 이 함수를 쓰는 모든
-- 화면(메인 홈 상단 통계 포함)이 자동으로 "최종 표시 방문자"를 보게 된다.
create or replace function public.get_today_site_traffic_stats()
returns table (view_count bigint, visitor_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.site_visits
      where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    (select count(distinct anonymous_profile_id) from public.site_visits
      where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
      + coalesce((select delta from public.site_visit_adjustments
      where adjustment_date = (now() at time zone 'Asia/Seoul')::date), 0);
$$;

-- ---------------------------------------------------------
-- C. 커뮤니티 관리 - 게시글
-- ---------------------------------------------------------
create or replace function public.admin_set_post_status(p_post_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_before text;
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  if p_status not in ('visible', 'hidden', 'deleted') then raise exception 'INVALID_STATUS'; end if;

  select status into v_before from public.posts where id = p_post_id;
  if v_before is null then raise exception 'POST_NOT_FOUND'; end if;

  update public.posts
  set status = p_status,
      deleted_at = case when p_status = 'deleted' then now() else null end,
      updated_at = now()
  where id = p_post_id;

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, before_value, after_value)
  values (v_admin_id, 'post', p_post_id, 'post_status_change', p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_set_post_notice(p_post_id uuid, p_is_notice boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  update public.posts set is_notice = p_is_notice, updated_at = now() where id = p_post_id;
  if not found then raise exception 'POST_NOT_FOUND'; end if;

  insert into public.audit_logs (admin_id, target_type, target_id, action, after_value)
  values (v_admin_id, 'post', p_post_id, case when p_is_notice then 'notice_set' else 'notice_unset' end,
    jsonb_build_object('is_notice', p_is_notice));
end;
$$;

create or replace function public.admin_set_post_best(p_post_id uuid, p_force boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  update public.posts
  set best_override_status = case when p_force then 'force_include' else 'auto' end, updated_at = now()
  where id = p_post_id;
  if not found then raise exception 'POST_NOT_FOUND'; end if;

  insert into public.audit_logs (admin_id, target_type, target_id, action, after_value)
  values (v_admin_id, 'post', p_post_id, case when p_force then 'best_set' else 'best_unset' end,
    jsonb_build_object('force', p_force));
end;
$$;

-- ---------------------------------------------------------
-- D. 커뮤니티 관리 - 댓글
-- ---------------------------------------------------------
create or replace function public.admin_set_comment_status(p_comment_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_before text;
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  if p_status not in ('visible', 'hidden', 'deleted') then raise exception 'INVALID_STATUS'; end if;

  select status into v_before from public.comments where id = p_comment_id;
  if v_before is null then raise exception 'COMMENT_NOT_FOUND'; end if;

  update public.comments
  set status = p_status,
      deleted_at = case when p_status = 'deleted' then now() else null end,
      updated_at = now()
  where id = p_comment_id;

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, before_value, after_value)
  values (v_admin_id, 'comment', p_comment_id, 'comment_status_change', p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

-- ---------------------------------------------------------
-- E. 회원 차단/해제
-- ---------------------------------------------------------
create or replace function public.admin_block_user(p_anonymous_profile_id uuid, p_reason text, p_until timestamptz default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'REASON_REQUIRED'; end if;

  insert into public.user_blocks (anonymous_profile_id, blocked_by_admin_id, reason, blocked_until)
  values (p_anonymous_profile_id, v_admin_id, trim(p_reason), p_until);

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, after_value)
  values (v_admin_id, 'user_block', p_anonymous_profile_id, 'user_blocked', trim(p_reason),
    jsonb_build_object('blocked_until', p_until));
end;
$$;

create or replace function public.admin_unblock_user(p_anonymous_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;

  delete from public.user_blocks where anonymous_profile_id = p_anonymous_profile_id;

  insert into public.audit_logs (admin_id, target_type, target_id, action)
  values (v_admin_id, 'user_block', p_anonymous_profile_id, 'user_unblocked');
end;
$$;

-- ---------------------------------------------------------
-- F. 신고 처리
-- ---------------------------------------------------------
create or replace function public.admin_resolve_report(p_report_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  if p_status not in ('resolved_normal', 'resolved_hidden', 'resolved_deleted', 'resolved_ban') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.reports
  set status = p_status::public.report_status, handled_by_admin_id = v_admin_id, handled_at = now()
  where id = p_report_id;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, after_value)
  values (v_admin_id, 'report', p_report_id, 'report_resolved', p_note, jsonb_build_object('status', p_status));
end;
$$;

-- ---------------------------------------------------------
-- G. grant execute - 전부 관리자 서버 액션(requireAdmin() 통과 후 세션 쿠키로 호출)
--    에서만 쓰이므로 authenticated에만 부여한다(각 함수 내부에서 current_admin_id()로
--    이중 검증). anon에는 부여하지 않는다.
-- ---------------------------------------------------------
grant execute on function public.admin_set_visitor_adjustment(int, text) to authenticated;
grant execute on function public.get_today_visitor_breakdown() to authenticated;
grant execute on function public.admin_set_post_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_post_notice(uuid, boolean) to authenticated;
grant execute on function public.admin_set_post_best(uuid, boolean) to authenticated;
grant execute on function public.admin_set_comment_status(uuid, text, text) to authenticated;
grant execute on function public.admin_block_user(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_today_visitor_breakdown();
