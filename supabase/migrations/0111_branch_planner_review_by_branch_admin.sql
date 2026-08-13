-- =========================================================
-- 0111_branch_planner_review_by_branch_admin.sql
-- 설계사의 지점 연결 승인은 **해당 지점 관리자**가 한다(오너 지시 2026-08-13).
--
-- ---------------------------------------------------------
-- 왜 필요한가 - 지금 아무도 승인할 수 없다
-- ---------------------------------------------------------
-- [실측 2026-08-13] branch_planner_registrations에 pending_review 5건이 쌓여 있는데,
-- 기존 `admin_review_branch_planner_registration`은
--   ⓐ 플랫폼 관리자(current_admin_id)만 부를 수 있고
--   ⓑ **코드 호출부가 0건**이다(types/database.ts의 타입 선언만 있다)
-- 즉 RPC는 있는데 **누르는 버튼이 만들어진 적이 없다.** 5명이 무기한 대기 중이었다.
--
-- 오너 판단은 「운영자가 아니라 해당 지점 관리자가 승인한다」이다. 지점장이 자기 지점
-- 소속 설계사를 가장 잘 알고, 운영팀은 그 관계를 확인할 방법이 없다.
--
-- ---------------------------------------------------------
-- 무엇을 만드나
-- ---------------------------------------------------------
-- 새 RPC `review_branch_planner_registration`(접두사 없음)을 만든다.
-- 🔴 기존 `admin_` 함수를 고쳐 지점장을 넣지 않는다 - 이름이 `admin_`인데 지점장도
-- 부를 수 있으면 **이름이 거짓말을 한다.** 다음 사람이 이름만 보고 권한을 판단한다.
--
-- 권한:
--   지점 관리자   is_ga_admin_for_branch(그 등록의 branch_id)   ← 주체
--   플랫폼 관리자 current_admin_id()                            ← 유지
--
-- ⚠️ 플랫폼 관리자를 남긴 이유: 오너 지시는 「운영자가 승인하는 게 아니다」로 **주체를
-- 옮기는 것**이지 운영 개입 자체를 막는 것으로 읽지 않았다. 지점장이 계정을 잃거나
-- 부적절한 승인을 했을 때 되돌릴 수단이 없으면 곤란하다. 막아야 한다면 아래
-- `or v_is_platform_admin` 한 줄만 빼면 된다.
--
-- ---------------------------------------------------------
-- 🔴 서류 경로를 지우는 동작은 그대로 가져온다
-- ---------------------------------------------------------
-- 기존 함수가 승인/반려 시 `business_card_path`·`income_doc_storage_path`를 null로
-- 비운다. 명함·소득서류는 심사용으로만 받는 것이라 판정이 끝나면 참조를 남기지 않는다.
-- **지점장이 승인 주체가 되어도 이 원칙은 같다** - 오히려 더 중요하다. 지점장은
-- 운영팀보다 그 사람과 가까운 사이라 서류가 남으면 안 된다.
-- =========================================================

create or replace function public.review_branch_planner_registration(
  p_registration_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_branch_id uuid;
  v_admin_id uuid := public.current_admin_id();
  v_is_platform_admin boolean := v_admin_id is not null;
begin
  if p_decision not in ('approved', 'on_hold', 'rejected', 'pending_review') then
    raise exception 'INVALID_DECISION';
  end if;

  select branch_id into v_branch_id
  from public.branch_planner_registrations
  where id = p_registration_id;

  if v_branch_id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;

  -- 🔴 지점 관리자가 주체다. 자기 지점의 신청만 볼 수 있고 처리할 수 있다.
  if not v_is_platform_admin and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
  end if;

  if p_decision = 'approved' then
    update public.branch_planner_registrations set
      status = 'approved',
      review_reason = null,
      reviewed_by_admin_id = v_admin_id,   -- 지점장이 처리하면 null이다(플랫폼 관리자 id 칸이다)
      reviewed_at = now(),
      -- 심사용으로만 받은 서류다. 판정이 끝나면 참조를 남기지 않는다.
      business_card_path = null,
      income_doc_storage_path = null,
      updated_at = now()
    where id = p_registration_id;

  elsif p_decision in ('on_hold', 'rejected') then
    -- 🔴 사유 없이 보류·반려할 수 없다. 신청자가 무엇을 고쳐야 하는지 알아야 한다.
    if length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    update public.branch_planner_registrations set
      status = p_decision,
      review_reason = trim(p_reason),
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      business_card_path = case when p_decision = 'rejected' then null else business_card_path end,
      income_doc_storage_path = case when p_decision = 'rejected' then null else income_doc_storage_path end,
      updated_at = now()
    where id = p_registration_id;

  else
    -- 되돌리기(보류 → 다시 심사 대기)
    update public.branch_planner_registrations set
      status = 'pending_review',
      review_reason = null,
      reviewed_by_admin_id = null,
      reviewed_at = null,
      updated_at = now()
    where id = p_registration_id;
  end if;
end;
$$;

-- 🔴 `from public`만으로는 anon이 안 지워진다(Supabase가 함수 생성 시점에 anon에게
-- 직접 grant를 준다). 0109에서 같은 자리를 고쳤으므로 처음부터 롤을 직접 적는다.
revoke all on function public.review_branch_planner_registration(uuid, text, text) from public, anon;
grant execute on function public.review_branch_planner_registration(uuid, text, text) to authenticated;

comment on function public.review_branch_planner_registration(uuid, text, text) is
  '설계사 지점 연결 심사. 주체는 **해당 지점 관리자**이고 플랫폼 관리자도 처리할 수 있다'
  '(오너 확정 2026-08-13). 승인/반려 시 명함·소득서류 경로를 비운다.';

-- ---------------------------------------------------------
-- 지점 관리자가 자기 지점 신청을 **읽을** 수 있어야 한다
-- ---------------------------------------------------------
-- ⚠️ 승인 화면은 목록을 먼저 보여줘야 한다. 조회 경로가 없으면 버튼만 있고 볼 것이 없다.
drop policy if exists "branch admins read their branch planner registrations"
  on public.branch_planner_registrations;

create policy "branch admins read their branch planner registrations"
  on public.branch_planner_registrations
  for select
  using (public.is_ga_admin_for_branch(branch_id));

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname='review_branch_planner_registration';   -- 1
-- select array_to_string(proacl,' | ') from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname='review_branch_planner_registration';   -- anon 없어야 한다
-- select policyname from pg_policies
--  where tablename='branch_planner_registrations' and cmd='SELECT';
