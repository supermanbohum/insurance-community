-- ---------------------------------------------------------
-- 우수 GA 랭킹 - "인기 GA"(조회수 기준)를 대체 (오너 지시 ⑤, 2026-08-10 대규모 개편)
--
-- 소속 TOP 설계사의 별등급을 점수로 환산해 GA 단위로 합산한다. 오너가 준 점수표:
--   1억 미만  1점  (원천징수 미제출자 포함)
--   1억 이상  3점  (star_1)
--   2억 이상  5점  (star_2)
--   3억 이상  10점 (star_3)
--   5억 이상  20점 (star_4)
--
-- 🔴 이번 버전은 "인증자만" 부분 버전이다 - "1억 미만(미제출자 포함) 1점" 티어는
-- 뺐다. 그 티어를 채우려면 GA 소속 설계사 전원의 명단(지점이 등록한 설계사 roster)
-- 이 있어야 하는데, 그건 오너 지시 ③(지점→설계사 등록 흐름)이 아직 없어서 지금은
-- "그 GA 소속으로 승인된 TOP 인증이 있는가"만 알 수 있다. ③이 생기면 미제출자
-- 1점 티어를 더하는 걸로 확장한다(지금 당장 만들지 않는다 - CTO 지시).
--
-- get_top_designer_home_ranking(0083)과 동일한 이유로 함수(뷰 아님)로 만든다 -
-- 원천 데이터(개별 확정연봉)를 절대 클라이언트에 노출하지 않고 합산 점수만
-- 반환한다.
-- ---------------------------------------------------------
create or replace function public.get_ga_quality_ranking(p_limit int default 10)
returns table (ga_company_id uuid, ga_company_name text, ga_company_slug text, score int, certified_designer_count int)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.slug,
    sum(
      case c.star_tier
        when 'star_1' then 3
        when 'star_2' then 5
        when 'star_3' then 10
        when 'star_4' then 20
        else 0
      end
    )::int as score,
    count(*)::int as certified_designer_count
  from public.top_designer_certifications c
  join public.ga_company g on g.id = c.ga_company_id
  where c.status = 'approved' and g.status = 'visible'
  group by g.id, g.name, g.slug
  order by score desc, certified_designer_count desc, g.name asc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_ga_quality_ranking(int) to anon, authenticated;
