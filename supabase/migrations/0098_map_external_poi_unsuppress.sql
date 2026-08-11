-- =========================================================
-- 0098_map_external_poi_unsuppress.sql
-- ⑪ 표시 중단 해제 - 0097의 짝. 운영자가 잘못 내린 건을 되돌릴 수 있어야 한다.
--
-- 해제는 "다시 수집 대상이 된다"는 뜻일 뿐, 그 자리에 행을 되살리지는 않는다.
-- 원본을 되살리면 우리가 수집하지도 않은 시점의 데이터를 복원하는 셈이라, 다음 수집
-- 배치가 실제로 그 장소를 다시 가져왔을 때만 화면에 돌아오는 게 맞다.
-- =========================================================

create or replace function public.admin_unsuppress_external_poi(p_source text, p_external_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  delete from public.map_external_poi_suppressions
  where source = p_source and external_id = p_external_id;
end;
$$;

grant execute on function public.admin_unsuppress_external_poi(text, text) to authenticated;
