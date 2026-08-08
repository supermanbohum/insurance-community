-- =========================================================
-- 0075_branch_registration_incomplete.sql (W-087③, P0 - 구현만, UI는 비활성)
-- 가입 관리자 7명 중 5명(71%)이 사진을 준비 못 해 아예 제출조차 못 하고 이탈했다
-- (DB 실측: 5명 전원 branch_id=null, draft 흔적도 0건). 오너 확정: 사진 요건은
-- 완화하지 않는다 - 그래서 review_branch_registration()(승인 게이트)은 절대 건드리지
-- 않는다. 대신 "사진 없이도 일단 저장"할 수 있는 별도 경로를 새로 연다.
--
-- status='incomplete'는 'pending'과 명확히 분리한다 - W-086에서 만든 대기열
-- (배지/목록/관리자 푸시)은 전부 status='pending'만 세므로, incomplete는 자동으로
-- 대기열에 안 잡힌다(오염 없음). 나중에 사진을 마저 올리고 complete_branch_registration()을
-- 호출해야 비로소 'pending'으로 전환되어 실제 승인 큐에 들어간다 - 그때는
-- review_branch_registration()과 동일한 필수 조건(대표사진1+사무실사진3+서류2종+
-- 소개글50자)을 여기서 미리 확인한다.
--
-- 프론트엔드에서는 아직 이 경로로 갈 방법이 없다(OnboardingForm.tsx의
-- ALLOW_INCOMPLETE_SUBMIT = false로 막아둠) - 오너 설명 후 그 상수만 true로 바꾸면
-- 바로 켜지는 구조.
-- 0074 적용 후 실행.
-- =========================================================

alter table public.branch_registrations drop constraint branch_registrations_status_check;
alter table public.branch_registrations add constraint branch_registrations_status_check
  check (status in ('draft', 'incomplete', 'pending', 'approved', 'rejected'));

-- ---------------------------------------------------------
-- A. 사진 없이 신규 지점 등록 저장 - submit_branch_registration()과 동일한 검증/생성
--    로직이지만 registration.status를 'pending'이 아니라 'incomplete'로 만든다.
-- ---------------------------------------------------------
create or replace function public.submit_branch_registration_incomplete(
  p_ga_name text,
  p_branch_slug text,
  p_branch_name text,
  p_region_id uuid,
  p_manager_name text,
  p_address text,
  p_address_detail text,
  p_registrant_name text,
  p_registrant_title text,
  p_registrant_phone text,
  p_registrant_company text,
  p_registrant_branch_label text,
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
returns table (registration_id uuid, ga_company_id uuid, branch_id uuid)
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
  v_registration_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if v_admin.ga_company_id is not null then
    raise exception 'ALREADY_HAS_COMPANY';
  end if;

  v_ga_name := trim(p_ga_name);
  if v_ga_name = '' or length(trim(p_branch_name)) = 0 or length(trim(p_address)) = 0
     or length(trim(p_branch_slug)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if length(trim(p_registrant_name)) = 0 or length(trim(p_registrant_title)) = 0
     or length(trim(p_registrant_phone)) = 0 or length(trim(p_registrant_company)) = 0
     or length(trim(p_registrant_branch_label)) = 0 then
    raise exception 'MISSING_REGISTRANT_INFO';
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

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, status, registration_status, status_reason, lat, lng,
    tagline, new_recruit_training, experienced_hire, db_support, settlement_support
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', v_is_new_company, 'hidden', 'pending', 'content_review', p_lat, p_lng,
    nullif(trim(coalesce(p_tagline, '')), ''), p_new_recruit_training, p_experienced_hire, p_db_support, p_settlement_support
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  insert into public.branch_registrations (
    request_type, status, branch_id, ga_company_id, submitted_by_ga_admin_id,
    registrant_name, registrant_title, registrant_phone, registrant_company, registrant_branch_label,
    payload
  ) values (
    'create', 'incomplete', v_branch_id, v_company_id, v_admin.id,
    trim(p_registrant_name), trim(p_registrant_title), trim(p_registrant_phone), trim(p_registrant_company), trim(p_registrant_branch_label),
    jsonb_build_object('branchName', p_branch_name, 'gaName', v_ga_name)
  ) returning id into v_registration_id;

  return query select v_registration_id, v_company_id, v_branch_id;
end;
$$;

grant execute on function public.submit_branch_registration_incomplete(
  text, text, text, uuid, text, text, text, text, text, text, text, text,
  text, int, boolean, boolean, text, double precision, double precision,
  text, boolean, boolean, boolean, boolean
) to authenticated;

-- ---------------------------------------------------------
-- B. 미완성 등록을 실제 승인 큐로 전환 - 사진을 마저 올린 뒤 호출한다.
--    review_branch_registration()의 photo/doc 체크와 완전히 동일한 기준을 재사용한다
--    (승인 게이트 자체는 그대로 두고, 그 앞단에서 미리 같은 기준으로 확인한다).
-- ---------------------------------------------------------
create or replace function public.complete_branch_registration(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.branch_registrations;
  v_admin public.ga_admin_users;
  v_intro_text text;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;

  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null or v_reg.submitted_by_ga_admin_id <> v_admin.id then
    raise exception 'NOT_REGISTRATION_OWNER';
  end if;
  if v_reg.status <> 'incomplete' then
    raise exception 'NOT_INCOMPLETE';
  end if;

  if v_reg.lease_contract_path is null or v_reg.business_card_path is null then
    raise exception 'MISSING_REQUIRED_DOCUMENTS';
  end if;
  if not exists (select 1 from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_main') then
    raise exception 'MISSING_MAIN_PHOTO';
  end if;
  if (select count(*) from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_office') < 3 then
    raise exception 'MISSING_OFFICE_PHOTOS';
  end if;

  select intro_text into v_intro_text from public.ga_branch where id = v_reg.branch_id;
  if v_intro_text is null or length(trim(v_intro_text)) < 50 then
    raise exception 'INTRO_TEXT_TOO_SHORT';
  end if;

  update public.branch_registrations
  set status = 'pending', updated_at = now()
  where id = p_registration_id;
end;
$$;

grant execute on function public.complete_branch_registration(uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname in ('submit_branch_registration_incomplete','complete_branch_registration');
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'branch_registrations_status_check';
