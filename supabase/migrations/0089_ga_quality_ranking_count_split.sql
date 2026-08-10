-- =========================================================
-- 0089_ga_quality_ranking_count_split.sql
-- CTO 지적(2026-08-10, 0088 리뷰): 0088이 certified_designer_count에 미인증
-- 등록자(1점 티어)까지 섞어 넣어서 컬럼명("인증 설계사 수")과 실제 값이 어긋났다.
-- "인증 N명"으로 화면에 쓰면 거짓이 된다 - certified_count(TOP 인증만)와
-- registered_count(TOP 인증 + ③ 미인증 등록, 전체)로 분리한다.
-- 0088 파일은 수정하지 않고(기존 마이그레이션 불변 규칙) create or replace로 다시
-- 정의한다. 반환 컬럼 집합이 바뀌므로(certified_designer_count 하나 → certified_count/
-- registered_count 둘) create or replace로는 안 되고 먼저 drop해야 한다("cannot change
-- return type of existing function" - SQL 시뮬레이션으로 직접 확인함).
-- =========================================================
drop function if exists public.get_ga_quality_ranking(int);

create or replace function public.get_ga_quality_ranking(p_limit int default 10)
returns table (
  ga_company_id uuid,
  ga_company_name text,
  ga_company_slug text,
  score int,
  certified_count int,
  registered_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with certified as (
    select
      g.id as ga_company_id,
      g.name as ga_company_name,
      g.slug as ga_company_slug,
      case c.star_tier
        when 'star_1' then 3
        when 'star_2' then 5
        when 'star_3' then 10
        when 'star_4' then 20
        else 0
      end as points,
      true as is_certified
    from public.top_designer_certifications c
    join public.ga_company g on g.id = c.ga_company_id
    where c.status = 'approved' and g.status = 'visible'
  ),
  uncertified as (
    select
      g.id as ga_company_id,
      g.name as ga_company_name,
      g.slug as ga_company_slug,
      1 as points,
      false as is_certified
    from public.branch_planner_registrations r
    join public.ga_branch b on b.id = r.branch_id
    join public.ga_company g on g.id = b.ga_company_id
    where r.status = 'approved'
      and g.status = 'visible'
      and not exists (
        select 1 from public.top_designer_certifications c
        where c.user_id = r.user_id and c.status = 'approved'
      )
  ),
  combined as (
    select * from certified
    union all
    select * from uncertified
  )
  select
    ga_company_id,
    ga_company_name,
    ga_company_slug,
    sum(points)::int as score,
    count(*) filter (where is_certified)::int as certified_count,
    count(*)::int as registered_count
  from combined
  group by ga_company_id, ga_company_name, ga_company_slug
  order by score desc, registered_count desc, ga_company_name asc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_ga_quality_ranking(int) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_ga_quality_ranking(10);
