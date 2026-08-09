-- =========================================================
-- 0083_top_designer_home_ranking.sql (Phase 2)
-- 오너 확정 사양(2026-08-09): "top설계사 실시간 랭킹은. ga/ㅇㅇ본부(지점) ㅇㅇㅇ설계사.
-- 만 표기되고 프로필은 안나옴 단, 해당 랭킹에 설계사 글씨를 누르면 해당설계사 top설계사
-- 프로필로 들어가짐 연봉기준으로 경쟁하는거야"
--
-- 연봉 "기준"으로 정렬하되 금액 자체는 화면에 표시하지 않는다(등급만 표시하는 기존
-- 원칙과 동일 - public_top_designer_certifications 뷰도 income을 노출한 적이 없다).
-- 뷰는 클라이언트가 임의 컬럼으로 order by를 걸 수 있어 income을 노출하지 않고는
-- 서버 사이드 정렬을 강제할 수 없으므로, 정렬·상위 N 절단을 전부 서버에서 확정하는
-- RPC로 만든다(뷰가 아니라 함수 - PostgREST가 함수 반환 컬럼만 노출).
-- =========================================================

create or replace function public.get_top_designer_home_ranking(p_limit int default 10)
returns table (
  id uuid,
  name text,
  ga_company_name text,
  branch_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, g.name as ga_company_name, c.branch_name
  from public.top_designer_certifications c
  join public.ga_company g on g.id = c.ga_company_id
  where c.status = 'approved'
  order by c.confirmed_annual_income_krw desc nulls last, c.reviewed_at asc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_top_designer_home_ranking(int) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_top_designer_home_ranking(10);
