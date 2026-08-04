-- =========================================================
-- 0039_planner_profile_views.sql
-- 설계사 프로필 조회수 - "내 설계사 관리"(/planner-market/my)에서 총 조회수/
-- 최근 7일 조회수/연락처 열람 횟수를 보여준다("관심등록 수"는 사용자가 명시적으로
-- "추후"라고 미룬 항목이라 이번엔 만들지 않는다). branch_views(0006)와 동일한
-- "집계 로그 테이블 + RPC로만 기록" 패턴을 따른다.
--
-- 0038 적용 후 실행.
-- =========================================================

create table if not exists public.planner_profile_views (
  id uuid primary key default gen_random_uuid(),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_planner_profile_views_profile_time
  on public.planner_profile_views(planner_profile_id, viewed_at desc);

alter table public.planner_profile_views enable row level security;
-- 정책 없음 - 기록은 아래 RPC 전용(누구나 호출 가능하지만 insert만), 집계 조회는
-- get_my_planner_market_profile_stats()로 본인 것만 반환한다(원본 로그 테이블
-- 직접 select는 아무도 허용하지 않는다 - 열람자 패턴 노출 방지).

-- 공개 상세페이지 진입 시 호출 - 존재하지 않거나 비공개 프로필이면 조용히 무시한다
-- (조회 기록 실패로 페이지 자체가 깨지면 안 되므로 예외를 던지지 않는다).
create or replace function public.record_planner_profile_view(p_planner_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.planner_profiles
    where id = p_planner_profile_id and status = 'approved' and is_hidden = false and withdrawn_at is null
  ) then
    return;
  end if;

  insert into public.planner_profile_views (planner_profile_id) values (p_planner_profile_id);
end;
$$;

grant execute on function public.record_planner_profile_view(uuid) to anon, authenticated;

-- 연락처 열람 횟수는 이미 있는 planner_market_credit_unlocks(0036)를 그대로 센다 -
-- 별도 카운터 컬럼을 새로 두지 않는다(단일 진실 소스 유지).
create or replace function public.get_my_planner_market_profile_stats()
returns table (total_views bigint, views_last_7_days bigint, contact_unlock_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*) from public.planner_profile_views v
      join public.planner_profiles p on p.id = v.planner_profile_id
      where p.user_id = public.current_member_id()
    ),
    (
      select count(*) from public.planner_profile_views v
      join public.planner_profiles p on p.id = v.planner_profile_id
      where p.user_id = public.current_member_id() and v.viewed_at > now() - interval '7 days'
    ),
    (
      select count(*) from public.planner_market_credit_unlocks u
      join public.planner_profiles p on p.id = u.planner_profile_id
      where p.user_id = public.current_member_id()
    );
$$;

grant execute on function public.get_my_planner_market_profile_stats() to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select public.record_planner_profile_view('<planner_profile_id>');
-- select * from public.get_my_planner_market_profile_stats(); -- 로그인 세션 필요
