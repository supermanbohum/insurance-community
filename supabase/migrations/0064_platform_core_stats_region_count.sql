-- =========================================================
-- 0064_platform_core_stats_region_count.sql (W-054)
-- 홈 화면 방문자 카운터 미만 대체 문구("전국 GA 50곳 · 229개 지역 정리 중")가
-- regions 테이블 행 수를 하드코딩 없이 실시간으로 읽을 수 있게 get_platform_core_stats()
-- 반환값에 region_count를 추가한다. 0062가 손댄 것과 동일 함수라 그 위에서 이어간다.
-- =========================================================

-- 반환 컬럼(OUT 파라미터) 구성이 바뀌므로 create or replace로는 안 되고 drop 후 재생성해야
-- 한다(0062까지의 시그니처를 참조하는 뷰/함수가 없음을 사전에 information_schema로 확인함).
drop function if exists public.get_platform_core_stats();

create function public.get_platform_core_stats()
returns table(
  approved_ga_count bigint,
  approved_branch_count bigint,
  registered_planner_count bigint,
  today_new_ga_count bigint,
  today_new_branch_count bigint,
  today_new_planner_count bigint,
  region_count bigint
)
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
    (select count(*) from public.planner_profiles where status = 'approved' and reviewed_at >= v_today_start),
    (select count(*) from public.regions);
end;
$$;
