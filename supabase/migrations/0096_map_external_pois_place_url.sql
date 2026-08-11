-- =========================================================
-- 0096_map_external_pois_place_url.sql
-- ⑪ 수집 항목 추가 - 네이버 장소 URL(CTO 지시, 콘텐츠 지적에서 출발).
--
-- 팝업 CTA 2개 중 하나가 [네이버 지도에서 보기]인데, 장소 URL을 수집하지 않으면
-- 그 버튼을 만들 수 없다. 나중에 다시 긁으면 수집을 두 번 하는 셈이라 위험도 두 배다
-- - 처음 수집할 때 같이 받는다.
--
-- 🔴 nullable이다. 소스가 장소 URL을 안 주는 경우가 실제로 있을 수 있고, 그때
-- 화면은 [네이버 지도에서 보기] 버튼을 아예 렌더하지 않는다(디자인 확정 - "미수집분은
-- 네이버 버튼 자체를 렌더하지 말고 등록 CTA 1개 전폭"). 없는 링크를 버튼으로 만들지
-- 않는 것이 원칙이라, 빈 문자열이 아니라 null로 남겨 "없음"이 명확해야 한다.
--
-- 0095를 수정하지 않고 새 파일로 추가한다(기존 마이그레이션 파일 불변 원칙). 0095가
-- 아직 어디에도 적용되지 않았지만, 적용 시점을 내가 통제하지 않으므로 예외를 두지 않는다.
-- =========================================================

alter table public.map_external_pois
  add column if not exists place_url text;

comment on column public.map_external_pois.place_url is
  '수집원의 장소 상세 URL. null이면 화면에서 [네이버 지도에서 보기] CTA를 렌더하지 않는다(없는 링크를 버튼으로 만들지 않는다).';

-- ---------------------------------------------------------
-- upsert RPC에 place_url을 추가한다. 0095에서 만든 함수와 시그니처가 같으므로
-- create or replace로 본문만 교체된다(반환 타입·인자 동일).
-- ---------------------------------------------------------
create or replace function public.admin_upsert_external_pois(p_source text, p_pois jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_count integer := 0;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if length(trim(coalesce(p_source, ''))) = 0 then
    raise exception 'INVALID_SOURCE';
  end if;
  if jsonb_typeof(p_pois) <> 'array' then
    raise exception 'INVALID_PAYLOAD';
  end if;

  insert into public.map_external_pois (
    source, external_id, name, address, road_address, phone, place_url, lat, lng, collected_at
  )
  select
    p_source,
    poi->>'external_id',
    poi->>'name',
    nullif(trim(coalesce(poi->>'address', '')), ''),
    nullif(trim(coalesce(poi->>'road_address', '')), ''),
    nullif(trim(coalesce(poi->>'phone', '')), ''),
    nullif(trim(coalesce(poi->>'place_url', '')), ''),
    (poi->>'lat')::double precision,
    (poi->>'lng')::double precision,
    now()
  from jsonb_array_elements(p_pois) as poi
  where poi->>'external_id' is not null
    and poi->>'name' is not null
    and poi->>'lat' is not null
    and poi->>'lng' is not null
  on conflict (source, external_id) do update set
    name = excluded.name,
    address = excluded.address,
    road_address = excluded.road_address,
    phone = excluded.phone,
    place_url = excluded.place_url,
    lat = excluded.lat,
    lng = excluded.lng,
    collected_at = excluded.collected_at,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_upsert_external_pois(text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select count(*) as total, count(place_url) as with_place_url, count(phone) as with_phone
-- from public.map_external_pois;
