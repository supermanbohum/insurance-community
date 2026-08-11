-- =========================================================
-- 0095_map_external_pois.sql
-- ⑪ 전국 지점 지도 - 외부에서 수집한 "아직 보험맵에 등록되지 않은 지점" 저장소.
--
-- 🔴 ga_branch와 완전히 분리한다(REDESIGN §⑪ 확정 - ga_branch에 source 컬럼을 붙이는
-- 안은 기각됐다). 홈·검색·GA찾기·랭킹·우수GA 점수는 이 테이블의 존재 자체를 모른다.
-- 분리하는 이유: 이 데이터는 우리가 검증하지 않은 외부 사실이라, 한 테이블에 섞이는
-- 순간 "등록 지점 수" 같은 모든 집계가 오염되고 되돌리기 어려워진다. 지도만 읽는다.
--
-- 🔴 생성값을 담을 컬럼을 아예 만들지 않는다. 소개글·설계사 수·태그라인·평점 컬럼이
-- 없으므로 나중에 누가 "채워 넣고 싶어도" 넣을 자리가 없다(어제 시드 사고 - 실존
-- 회사명에 조합된 주소와 지어낸 소개글이 붙었던 건 그런 컬럼이 있었기 때문이다).
-- 수집한 사실(상호·주소·좌표·연락처)만 담고, 없으면 null로 두고 화면에서 "없음"이라
-- 밝힌다. 정책을 문서가 아니라 스키마로 강제하는 게 이 설계의 핵심이다.
--
-- 연락처(phone)는 수집되면 넣고 아니면 null이다 - 빈 문자열로 채우지 않는다.
-- "수집 안 됨"과 "없음"을 구분할 수 있어야 나중에 재수집 대상을 고를 수 있다.
-- =========================================================

create table public.map_external_pois (
  id uuid primary key default gen_random_uuid(),
  -- 소스 식별 - 어디서 왔는지 행마다 남긴다(수집 방법이 바뀌면 소스명도 바뀐다).
  source text not null,
  -- 소스가 주는 고유 키. 재수집 시 같은 장소를 중복 생성하지 않기 위한 유일 키다.
  external_id text not null,
  name text not null,
  address text,
  road_address text,
  phone text,
  lat double precision not null,
  lng double precision not null,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_external_pois_source_external_id_key unique (source, external_id)
);

-- 지도는 항상 현재 보이는 영역(bounds)으로만 조회한다 - 전국을 한 번에 내려주지 않는다.
create index map_external_pois_lat_lng_idx on public.map_external_pois (lat, lng);

alter table public.map_external_pois enable row level security;

-- 공개 읽기 전용. 쓰기 정책은 만들지 않는다 - 아래 admin RPC(security definer)로만 들어온다.
create policy "anyone reads external pois" on public.map_external_pois
  for select using (true);

grant select on public.map_external_pois to anon, authenticated;

-- ---------------------------------------------------------
-- 수집 스크립트용 일괄 upsert - 서비스롤 키를 쓰지 않는다(오너 확정 제약). 운영자
-- 세션으로 이 RPC를 호출한다. 한 건씩 왕복하면 수천 건에서 느려서 jsonb 배열로 받는다.
--
-- 중간에 끊겨도 처음부터 다시 하지 않아도 된다 - (source, external_id) 유일키에
-- on conflict update라 이미 넣은 건 갱신만 되고 중복이 생기지 않는다. 스크립트는
-- 어디서 끊겼든 그냥 다시 돌리면 된다.
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

  insert into public.map_external_pois (source, external_id, name, address, road_address, phone, lat, lng, collected_at)
  select
    p_source,
    poi->>'external_id',
    poi->>'name',
    nullif(trim(coalesce(poi->>'address', '')), ''),
    nullif(trim(coalesce(poi->>'road_address', '')), ''),
    -- 빈 문자열은 null로 - "수집 안 됨"과 "빈 값"을 구분하기 위해서다.
    nullif(trim(coalesce(poi->>'phone', '')), ''),
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
-- select source, count(*), count(phone) as with_phone from public.map_external_pois group by source;
