-- =========================================================
-- 0065_platform_core_stats_public_planner_count.sql (W-054 보강)
-- 홈 "등록 설계사" 카운터는 그동안 registered_planner_count(GA 지점이 자체 신고한
-- 예상 인원 합계 + 승인된 설계사마켓 프로필 수를 합친 값, 현재 103)를 썼다. 그런데
-- 그 숫자를 눌러 이동하는 /planner-market/search가 실제로 보여주는 인원은
-- public_planner_profiles 뷰 기준(현재 2) 뿐이라, 두 값이 어긋나면 그 자체가
-- 신뢰를 깎는다(CTO/디자인팀 지적). 홈 카운터 전용으로 이 좁은 정의를 별도
-- 컬럼으로 추가한다 - registered_planner_count는 관리자 대시보드 등 기존
-- 소비자를 위해 그대로 둔다.
-- =========================================================

drop function if exists public.get_platform_core_stats();

create function public.get_platform_core_stats()
returns table(
  approved_ga_count bigint,
  approved_branch_count bigint,
  registered_planner_count bigint,
  today_new_ga_count bigint,
  today_new_branch_count bigint,
  today_new_planner_count bigint,
  region_count bigint,
  approved_planner_profile_count bigint
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
    (select count(*) from public.regions),
    (select count(*) from public.planner_profiles where status = 'approved' and is_hidden = false and withdrawn_at is null);
end;
$$;
