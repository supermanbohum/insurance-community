-- =========================================================
-- 0051_admin_dashboard_kpi_overhaul.sql
-- 관리자 대시보드 운영 관점 전면 개선:
--  1) 사이트 전역 방문 로그(site_visits) 신설 - "오늘 조회수"/"오늘 방문자"가
--     지금까지 지점 상세 페이지 조회(branch_views)에만 의존해 홈페이지 등
--     다른 페이지 방문으로는 전혀 증가하지 않던 문제를 해결한다.
--  2) 설계사 마켓 인기 랭킹(list_monthly_top_planner_profiles) - 지점은 이미
--     list_monthly_top_branches(0018)가 있지만 설계사는 없었다.
--  3) "오늘 신규(승인 기준)" 쿼리가 매 대시보드 로딩마다 reviewed_at으로
--     필터링할 수 있도록 인덱스 보강.
-- =========================================================

-- ---------------------------------------------------------
-- A. site_visits - 사이트 전역 방문 로그
--    branch_views와 동일한 구조/중복방지 방식(같은 익명 프로필이 site_settings.
--    duplicate_view_window_minutes 이내 재방문하면 새 행을 만들지 않음)을 그대로
--    따른다. branch_id가 없다는 점만 다르다 - 특정 지점이 아니라 사이트 자체의
--    방문을 기록하기 때문이다.
-- ---------------------------------------------------------
create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  anonymous_profile_id uuid not null references public.anonymous_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_visits_created_at on public.site_visits(created_at desc);
create index if not exists idx_site_visits_profile_created on public.site_visits(anonymous_profile_id, created_at desc);

alter table public.site_visits enable row level security;
-- 정책 없음 = service role(관리자 대시보드) 전용 조회. 쓰기는 아래 RPC를 통해서만.

-- ---------------------------------------------------------
-- B. record_site_visit() - (main) 레이아웃이 페이지 로드마다 호출한다.
--    record_branch_view()와 동일한 dedup 패턴.
-- ---------------------------------------------------------
create or replace function public.record_site_visit()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_window_minutes int;
  v_recent_exists boolean;
begin
  if v_profile_id is null then
    return;
  end if;

  select (value)::int into v_window_minutes
  from public.site_settings where key = 'duplicate_view_window_minutes';

  select exists (
    select 1 from public.site_visits
    where anonymous_profile_id = v_profile_id
      and created_at > now() - make_interval(mins => coalesce(v_window_minutes, 30))
  ) into v_recent_exists;

  if not v_recent_exists then
    insert into public.site_visits (anonymous_profile_id) values (v_profile_id);
  end if;
end;
$$;

grant execute on function public.record_site_visit() to anon, authenticated;

-- ---------------------------------------------------------
-- C. get_today_site_traffic_stats() - 관리자 대시보드 전용 집계.
--    "오늘"은 한국 표준시(KST) 기준 하루로 계산한다 - 서버가 UTC로 돌아가는
--    Vercel 환경에서 자정 이후 오전 9시까지 "어제" 데이터로 잘못 집계되던
--    문제를 함께 바로잡는다.
--    view_count = 오늘 방문 이벤트 총합(중복방지 윈도우 적용된 세션 단위),
--    visitor_count = 오늘 다녀간 서로 다른 방문자(익명 프로필) 수.
--    anon/authenticated에 grant하지 않는다 - service role(createAdminClient)
--    에서만 호출한다(다른 관리자 전용 집계 함수와 동일한 관례).
-- ---------------------------------------------------------
create or replace function public.get_today_site_traffic_stats()
returns table (view_count bigint, visitor_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select count(*), count(distinct anonymous_profile_id)
  from public.site_visits
  where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;

-- ---------------------------------------------------------
-- D. list_monthly_top_planner_profiles() - list_monthly_top_branches(0018)의
--    설계사 마켓 버전. 공개 노출 중인(status='approved' and is_hidden=false and
--    withdrawn_at is null) 프로필만 대상으로 이번 달 조회수 상위 N명을 반환한다.
--    관리자 대시보드 "TOP5 인기 설계사" 전용 - anon/authenticated에 grant하지 않는다.
-- ---------------------------------------------------------
create or replace function public.list_monthly_top_planner_profiles(p_limit int default 5)
returns table (planner_profile_id uuid, view_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.planner_profile_id, count(*) as view_count
  from public.planner_profile_views v
  join public.planner_profiles p on p.id = v.planner_profile_id
  where v.viewed_at >= date_trunc('month', now())
    and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null
  group by v.planner_profile_id
  order by view_count desc
  limit p_limit;
$$;

-- ---------------------------------------------------------
-- E. "오늘 신규(승인 기준)" 집계용 인덱스 보강
-- ---------------------------------------------------------
create index if not exists idx_ga_company_reviewed_at on public.ga_company(reviewed_at);
create index if not exists idx_branch_registrations_reviewed_at on public.branch_registrations(reviewed_at);
create index if not exists idx_branch_registrations_request_status on public.branch_registrations(request_type, status);
create index if not exists idx_planner_profiles_reviewed_at on public.planner_profiles(reviewed_at);

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_today_site_traffic_stats();
-- select * from public.list_monthly_top_planner_profiles(5);
