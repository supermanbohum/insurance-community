-- =========================================================
-- 0014_partner_ga_select_flow.sql
-- 파트너 등록 흐름을 "GA를 새로 만드는 것"에서 "이미 있는 GA(전국 보험대리점) 중
-- 하나를 선택해 그 아래에 내 지점을 등록하는 것"으로 바꾼다.
--
-- 배경: 보험맵은 GA를 홍보/등록하는 사이트가 아니라 "지점"을 찾는 플랫폼이다.
-- 기존 register_ga_for_partner는 파트너가 GA명을 자유 입력해 매번 새 ga_company를
-- 만들었다 - 이러면 같은 GA 아래 여러 지점(다른 담당자)이 등록될 수 없다.
-- register_branch_for_partner는 GA명이 이미 DB에 있으면 그 회사에 지점을 붙이고,
-- (전국 GA 마스터 목록에만 있고 아직 DB에는 없는 이름이면) 그 이름으로 회사 행을
-- 처음 한 번만 만든다 - 어느 쪽이든 파트너가 회사 프로필(대표자/소개)을 직접
-- 입력하지는 않는다.
--
-- 0013 적용 후 실행. register_ga_for_partner는 삭제하지 않는다(과거 방식으로 이미
-- 만들어진 GA/지점 데이터가 있다면 그대로 유효해야 하므로).
-- =========================================================

create or replace function public.register_branch_for_partner(
  p_ga_name text,
  p_branch_slug text,
  p_branch_name text,
  p_region_id uuid,
  p_manager_name text,
  p_address text,
  p_address_detail text,
  p_intro_text text default null,
  p_planner_count int default null,
  p_parking_available boolean default null,
  p_visit_consult_available boolean default null,
  p_business_hours text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (ga_company_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_company public.ga_company;
  v_company_id uuid;
  v_is_new_company boolean := false;
  v_ga_name text;
  v_slug_base text;
  v_slug text;
  v_suffix int := 0;
  v_branch_id uuid;
  v_branch_status text;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if v_admin.ga_company_id is not null then
    raise exception 'ALREADY_HAS_COMPANY';
  end if;

  v_ga_name := trim(p_ga_name);
  if length(v_ga_name) = 0 or length(trim(p_branch_name)) = 0 or length(trim(p_address)) = 0
     or length(trim(p_branch_slug)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_company from public.ga_company where name = v_ga_name;

  if v_company.id is not null then
    v_company_id := v_company.id;
  else
    v_is_new_company := true;
    v_slug_base := trim(both '-' from regexp_replace(lower(v_ga_name), '[^a-z0-9가-힣]+', '-', 'g'));
    if v_slug_base = '' then
      v_slug_base := 'ga';
    end if;
    v_slug := v_slug_base;
    while exists (select 1 from public.ga_company where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_slug_base || '-' || v_suffix;
    end loop;

    insert into public.ga_company (slug, name)
    values (v_slug, v_ga_name)
    returning id into v_company_id;
  end if;

  -- 이미 승인된 GA 아래에 (다른 담당자가) 새 지점을 추가하는 경우는 관리자 재검토 전까지 비공개.
  -- 방금 새로 만든 회사이거나 아직 심사 전/반려 상태면 바로 노출한다(회사 자체가 어차피 pending).
  v_branch_status := case when not v_is_new_company and v_company.approval_status = 'approved' then 'hidden' else 'visible' end;

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, status, lat, lng
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', v_is_new_company, v_branch_status, p_lat, p_lng
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  return query select v_company_id, v_branch_id;
end;
$$;

grant execute on function public.register_branch_for_partner(text, text, text, uuid, text, text, text, text, int, boolean, boolean, text, double precision, double precision) to authenticated;

-- ---------------------------------------------------------
-- 위/경도 누락 보완 - 기존 파트너 등록 함수들은 admin의 create_branch와 달리
-- p_lat/p_lng를 받지 않아 파트너가 등록한 지점은 좌표가 없어 지도에 마커로 뜨지
-- 않았다. register_ga_for_partner(첫 지점)와 create_partner_branch(추가 지점) 모두
-- 끝에 좌표 파라미터를 추가한다(기존 호출부와 호환되도록 옵션으로 default null).
-- ---------------------------------------------------------
create or replace function public.register_ga_for_partner(
  p_slug text,
  p_name text,
  p_ceo_name text,
  p_description text,
  p_branch_slug text,
  p_branch_name text,
  p_region_id uuid,
  p_manager_name text,
  p_address text,
  p_address_detail text,
  p_intro_text text default null,
  p_planner_count int default null,
  p_parking_available boolean default null,
  p_visit_consult_available boolean default null,
  p_business_hours text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (ga_company_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_company_id uuid;
  v_branch_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if v_admin.ga_company_id is not null then
    raise exception 'ALREADY_HAS_COMPANY';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_branch_name)) = 0 or length(trim(p_address)) = 0
     or length(trim(p_slug)) = 0 or length(trim(p_branch_slug)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.ga_company (slug, name, ceo_name, description)
  values (trim(p_slug), trim(p_name), nullif(trim(coalesce(p_ceo_name, '')), ''), nullif(trim(coalesce(p_description, '')), ''))
  returning id into v_company_id;

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, lat, lng
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', true, p_lat, p_lng
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  return query select v_company_id, v_branch_id;
end;
$$;

create or replace function public.create_partner_branch(
  p_slug text,
  p_name text,
  p_region_id uuid,
  p_manager_name text,
  p_address text,
  p_address_detail text,
  p_intro_text text default null,
  p_planner_count int default null,
  p_parking_available boolean default null,
  p_visit_consult_available boolean default null,
  p_business_hours text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_company public.ga_company;
  v_branch_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null or v_admin.ga_company_id is null then
    raise exception 'NOT_GA_ADMIN_WITH_COMPANY';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_address)) = 0 or length(trim(p_slug)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_company from public.ga_company where id = v_admin.ga_company_id;

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, status, lat, lng
  ) values (
    v_admin.ga_company_id, p_region_id, trim(p_slug), trim(p_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', false,
    case when v_company.approval_status = 'approved' then 'hidden' else 'visible' end,
    p_lat, p_lng
  ) returning id into v_branch_id;

  return v_branch_id;
end;
$$;

grant execute on function public.register_ga_for_partner(text, text, text, text, text, text, uuid, text, text, text, text, int, boolean, boolean, text, double precision, double precision) to authenticated;
grant execute on function public.create_partner_branch(text, text, uuid, text, text, text, text, int, boolean, boolean, text, double precision, double precision) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 사용자가 직접 검증)
-- ---------------------------------------------------------
-- select proname, pronargs from pg_proc where proname in ('register_branch_for_partner','register_ga_for_partner','create_partner_branch');
