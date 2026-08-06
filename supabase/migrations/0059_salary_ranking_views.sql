-- =========================================================
-- 0059_salary_ranking_views.sql
-- 연봉 랭킹 조회수 + 명예의 전당(연도별 1위, 별도 테이블 없이 파생 조회).
-- =========================================================

create table public.salary_ranking_views (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.salary_ranking_submissions(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index idx_salary_ranking_views_submission_time on public.salary_ranking_views(submission_id, viewed_at desc);

alter table public.salary_ranking_views enable row level security;
-- 정책 없음(0039/0057 view 로그와 동일) - insert/집계 모두 RPC 전용.

create or replace function public.record_salary_ranking_view(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.salary_ranking_submissions where id = p_submission_id and status = 'approved') then
    return;
  end if;
  insert into public.salary_ranking_views (submission_id) values (p_submission_id);
end;
$$;

grant execute on function public.record_salary_ranking_view(uuid) to anon, authenticated;

create or replace view public.public_salary_ranking_submissions
with (security_invoker = true) as
select
  s.id,
  s.planner_profile_id,
  s.ranking_year,
  s.job_title,
  s.display_name,
  s.confirmed_annual_income_krw as annual_income_krw,
  s.reviewed_at as ranked_at,
  s.created_at,
  p.profile_photo_path,
  p.active_region_id,
  (select count(*) from public.salary_ranking_views v where v.submission_id = s.id) as view_count
from public.salary_ranking_submissions s
join public.planner_profiles p on p.id = s.planner_profile_id
where s.status = 'approved' and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_salary_ranking_submissions to anon, authenticated;

-- ---------------------------------------------------------
-- 명예의 전당 - 연도별 1위만 추출. 과거 연도 행이 삭제되지 않는 한 자연히
-- "영구 보관"된다(별도 아카이브 테이블 불필요).
-- ---------------------------------------------------------
create or replace function public.get_salary_ranking_hall_of_fame()
returns table (
  ranking_year int,
  submission_id uuid,
  display_name text,
  job_title text,
  annual_income_krw bigint,
  profile_photo_path text,
  active_region_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (ranking_year)
    ranking_year, id, display_name, job_title, annual_income_krw, profile_photo_path, active_region_id
  from public.public_salary_ranking_submissions
  order by ranking_year desc, annual_income_krw desc, created_at asc;
$$;

grant execute on function public.get_salary_ranking_hall_of_fame() to anon, authenticated;
