-- =========================================================
-- 0088_ga_quality_ranking_registrations.sql
-- get_ga_quality_ranking(0086)이 예고했던 확장 - "1억 미만(미제출자 포함) 1점" 티어.
-- 0086 파일 자체를 수정하지 않고(기존 마이그레이션 불변 규칙) create or replace로
-- 새로 정의한다.
--
-- ③(branch_planner_registrations, 0087)이 그 "지점이 등록한 설계사 roster"다.
-- approved 상태인 ⓑ 등록 중, 같은 사람이 이미 승인된 TOP 인증(더 높은 점수)을 갖고
-- 있으면 중복 집계하면 안 되므로 user_id로 anti-join한다(CTO 승인 설계) - 두 테이블
-- 다 본인 로그인 등록이라 user_id가 공통 키다.
--
-- branch_planner_registrations은 ga_branch에 연결되지만 점수는 GA(ga_company) 단위로
-- 집계해야 하므로 ga_branch.ga_company_id로 한 단계 더 조인한다.
-- =========================================================
create or replace function public.get_ga_quality_ranking(p_limit int default 10)
returns table (ga_company_id uuid, ga_company_name text, ga_company_slug text, score int, certified_designer_count int)
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
      end as points
    from public.top_designer_certifications c
    join public.ga_company g on g.id = c.ga_company_id
    where c.status = 'approved' and g.status = 'visible'
  ),
  uncertified as (
    select
      g.id as ga_company_id,
      g.name as ga_company_name,
      g.slug as ga_company_slug,
      1 as points
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
    count(*)::int as certified_designer_count
  from combined
  group by ga_company_id, ga_company_name, ga_company_slug
  order by score desc, certified_designer_count desc, ga_company_name asc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_ga_quality_ranking(int) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_ga_quality_ranking(10);
