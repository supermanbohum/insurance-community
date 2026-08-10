-- =========================================================
-- 0093_ga_quality_ranking_by_region.sql
-- ⑨ 우리 동네 순위(오너 지시 "우리동네 제작해 만들어만둬") - get_ga_quality_ranking()의
-- 지역 필터 버전. 해석은 B로 확정(CTO/오너) - "그 지역에 지점이 있다는 이유만으로
-- 전국 점수를 올려주는 게 아니라, 그 지역 지점 소속 인증자·등록자의 점수만 합산"한다.
-- 0092에서 top_designer_certifications.branch_id 자동 배선을 먼저 끝냈기 때문에
-- 고배점(TOP 인증, 3~20점)과 저배점(③ 등록, 1점) 둘 다 지역 귀속이 가능해졌다.
--
-- 시/도만 줄 수도, 시/도+시/군/구(2단 드릴다운, B2와 동일 패턴)까지 좁힐 수도 있다 -
-- B2(검색 필터)가 이미 쓰는 "sido_code 광역매치 vs 정확한 region_id" 이중 구조를
-- 그대로 재사용한다(src/lib/public/branch.supabase.ts의 sidoCode 처리와 동일 방식).
--
-- get_ga_quality_ranking() 원본은 건드리지 않는다 - 홈/랭킹 페이지가 이미 그 시그니처로
-- 쓰고 있어 손대면 영향 범위가 넓어진다. 완전히 새 함수로 분리한다.
-- =========================================================

create or replace function public.get_ga_quality_ranking_by_region(
  p_sido_code text,
  p_sigungu_region_id uuid default null,
  p_limit integer default 10
)
returns table(ga_company_id uuid, ga_company_name text, ga_company_slug text, score integer, certified_count integer, registered_count integer)
language sql
stable
security definer
set search_path = public
as $$
  with matched_regions as (
    select id from public.regions
    where sido_code = p_sido_code
      and (p_sigungu_region_id is null or id = p_sigungu_region_id)
  ),
  certified as (
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
    join public.ga_branch b on b.id = c.branch_id
    where c.status = 'approved' and g.status = 'visible'
      and b.region_id in (select id from matched_regions)
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
      and b.region_id in (select id from matched_regions)
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

grant execute on function public.get_ga_quality_ranking_by_region(text, uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_ga_quality_ranking_by_region('11', null, 10);
