-- =========================================================
-- 0016_branch_tagline_amenities.sql
-- 지점 등록 페이지 개선: 한 줄 소개 + 편의시설/지원 체크박스 4종을 추가한다.
--
-- db_support_info/settlement_support_info(자유 텍스트, 이미 있음)와는 별개로
-- "제공 여부"만 빠르게 표시할 수 있는 단순 boolean 플래그를 둔다 - 지도 카드/
-- 리스트처럼 좁은 공간에서는 긴 텍스트 대신 배지 하나로 보여줘야 하기 때문.
--
-- 0006 적용 후 실행.
-- =========================================================

alter table public.ga_branch
  add column if not exists tagline text,
  add column if not exists new_recruit_training boolean,
  add column if not exists experienced_hire boolean,
  add column if not exists db_support boolean,
  add column if not exists settlement_support boolean;

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
  p_lng double precision default null,
  p_tagline text default null,
  p_new_recruit_training boolean default null,
  p_experienced_hire boolean default null,
  p_db_support boolean default null,
  p_settlement_support boolean default null
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

  v_branch_status := case when not v_is_new_company and v_company.approval_status = 'approved' then 'hidden' else 'visible' end;

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, status, lat, lng,
    tagline, new_recruit_training, experienced_hire, db_support, settlement_support
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', v_is_new_company, v_branch_status, p_lat, p_lng,
    nullif(trim(coalesce(p_tagline, '')), ''), p_new_recruit_training, p_experienced_hire, p_db_support, p_settlement_support
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  return query select v_company_id, v_branch_id;
end;
$$;

grant execute on function public.register_branch_for_partner(
  text, text, text, uuid, text, text, text, text, int, boolean, boolean, text, double precision, double precision,
  text, boolean, boolean, boolean, boolean
) to authenticated;

-- ---------------------------------------------------------
-- 파트너 지점 수정 화면에서도 같은 필드를 편집할 수 있도록 update_partner_branch도 확장.
-- ---------------------------------------------------------
create or replace function public.update_partner_branch(
  p_branch_id uuid,
  p_name text,
  p_region_id uuid,
  p_address text,
  p_address_detail text default null,
  p_intro_text text default null,
  p_education_info text default null,
  p_welfare_info text default null,
  p_db_support_info text default null,
  p_settlement_support_info text default null,
  p_planner_count int default null,
  p_parking_available boolean default null,
  p_visit_consult_available boolean default null,
  p_business_hours text default null,
  p_tagline text default null,
  p_new_recruit_training boolean default null,
  p_experienced_hire boolean default null,
  p_db_support boolean default null,
  p_settlement_support boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_address)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.ga_branch
  set name = trim(p_name),
      region_id = p_region_id,
      address = trim(p_address),
      address_detail = nullif(trim(coalesce(p_address_detail, '')), ''),
      intro_text = nullif(trim(coalesce(p_intro_text, '')), ''),
      education_info = nullif(trim(coalesce(p_education_info, '')), ''),
      welfare_info = nullif(trim(coalesce(p_welfare_info, '')), ''),
      db_support_info = nullif(trim(coalesce(p_db_support_info, '')), ''),
      settlement_support_info = nullif(trim(coalesce(p_settlement_support_info, '')), ''),
      planner_count = p_planner_count,
      parking_available = p_parking_available,
      visit_consult_available = p_visit_consult_available,
      business_hours = nullif(trim(coalesce(p_business_hours, '')), ''),
      tagline = nullif(trim(coalesce(p_tagline, '')), ''),
      new_recruit_training = p_new_recruit_training,
      experienced_hire = p_experienced_hire,
      db_support = p_db_support,
      settlement_support = p_settlement_support
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.update_partner_branch(
  uuid, text, uuid, text, text, text, text, text, text, text, int, boolean, boolean, text,
  text, boolean, boolean, boolean, boolean
) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 사용자가 직접 검증)
-- ---------------------------------------------------------
-- select column_name from information_schema.columns where table_name = 'ga_branch' and column_name in ('tagline','new_recruit_training','experienced_hire','db_support','settlement_support');
