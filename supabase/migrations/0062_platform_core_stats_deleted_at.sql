-- =========================================================
-- 0062_platform_core_stats_deleted_at.sql (W-050)
-- get_platform_core_stats()가 ga_branch/ga_company의 deleted_at을 보지 않아,
-- 시드 정리(W-006)로 소프트삭제한 150개 지점을 그대로 카운트하고 있었다
-- (approved_branch_count 151, registered_planner_count 6,975 - 실제는 1 / 103).
-- 홈/관리자 대시보드가 공유하는 RPC라 두 화면 모두 동시에 정상화된다.
-- =========================================================

create or replace function public.get_platform_core_stats()
returns table(approved_ga_count bigint, approved_branch_count bigint, registered_planner_count bigint, today_new_ga_count bigint, today_new_branch_count bigint, today_new_planner_count bigint)
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_today_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  return query
  select
    (select count(*) from public.ga_company where approval_status = 'approved' and deleted_at is null),
    (
      select count(*)
      from public.ga_branch b
      join public.ga_company c on c.id = b.ga_company_id
      where b.status = 'visible' and b.registration_status = 'approved' and b.deleted_at is null and c.approval_status = 'approved' and c.deleted_at is null
    ),
    (
      coalesce((
        select sum(b.planner_count)
        from public.ga_branch b
        join public.ga_company c on c.id = b.ga_company_id
        where b.status = 'visible' and b.registration_status = 'approved' and b.deleted_at is null and c.approval_status = 'approved' and c.deleted_at is null
      ), 0)
      +
      (select count(*) from public.planner_profiles where status = 'approved' and is_hidden = false and withdrawn_at is null)
    ),
    (select count(*) from public.ga_company where approval_status = 'approved' and deleted_at is null and reviewed_at >= v_today_start),
    (select count(*) from public.branch_registrations where request_type = 'create' and status = 'approved' and reviewed_at >= v_today_start),
    (select count(*) from public.planner_profiles where status = 'approved' and reviewed_at >= v_today_start);
end;
$$;
