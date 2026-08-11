-- =========================================================
-- 0097_map_external_poi_suppressions.sql
-- ⑪ 이의제기 창구의 전제 - "한 번 지운 건 다시 안 올라온다"(콘텐츠 구현조건 2, CTO 확정).
--
-- 팝업에 "표시를 원하지 않으시면 알려주세요 - 바로 내려드립니다"를 넣는데, 지운 지점이
-- 다음 수집 배치에서 그대로 다시 올라오면 그 약속이 거짓이 된다. 삭제만으로는 부족하다
-- - map_external_pois에서 지워도 다음 수집이 같은 external_id를 다시 넣기 때문이다.
-- 그래서 "지웠다"는 사실 자체를 별도 테이블에 남기고, 수집 RPC가 그 목록을 건너뛴다.
--
-- 🔴 reason이 nullable인 것은 실수가 아니라 정책이다. 오너 확정 - "표시 삭제 요청은
-- 논쟁 없이 즉시 삭제하고 사유를 묻지 않는다(우리가 동의 없이 올린 것이라 '왜 지우냐'고
-- 물을 자격이 없다)". 사유를 not null로 두면 운영자가 요청자에게 사유를 캐물어야 하는
-- 구조가 되므로 일부러 비워둘 수 있게 한다.
-- =========================================================

create table public.map_external_poi_suppressions (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  -- 선택 입력. 위 주석 참고 - 사유를 요구하지 않는 것이 정책이다.
  reason text,
  suppressed_by_admin_id uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  constraint map_external_poi_suppressions_source_external_id_key unique (source, external_id)
);

alter table public.map_external_poi_suppressions enable row level security;
-- 공개 조회 대상이 아니다(누가 내려달라고 했는지가 드러날 이유가 없다). 정책을 만들지
-- 않으므로 anon/authenticated는 읽을 수 없고, 아래 security definer 함수만 참조한다.

-- ---------------------------------------------------------
-- 표시 중단 - 목록에 남기고 현재 행도 즉시 지운다. 두 동작이 한 트랜잭션이라
-- "지웠는데 목록에 안 남는" 중간 상태가 생기지 않는다.
-- ---------------------------------------------------------
create or replace function public.admin_suppress_external_poi(
  p_source text,
  p_external_id text,
  p_reason text default null
)
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

  insert into public.map_external_poi_suppressions (source, external_id, reason, suppressed_by_admin_id)
  values (p_source, p_external_id, nullif(trim(coalesce(p_reason, '')), ''), v_admin_id)
  on conflict (source, external_id) do nothing;

  delete from public.map_external_pois
  where source = p_source and external_id = p_external_id;
end;
$$;

grant execute on function public.admin_suppress_external_poi(text, text, text) to authenticated;

-- ---------------------------------------------------------
-- 수집 RPC가 표시 중단 목록을 건너뛰도록 갱신한다. 이 한 줄(not exists)이 없으면
-- 위 테이블은 기록만 남을 뿐 아무것도 막지 못한다.
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
    -- 🔴 표시 중단 요청을 받은 곳은 다시 넣지 않는다.
    and not exists (
      select 1 from public.map_external_poi_suppressions s
      where s.source = p_source and s.external_id = poi->>'external_id'
    )
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
-- select count(*) from public.map_external_poi_suppressions;
