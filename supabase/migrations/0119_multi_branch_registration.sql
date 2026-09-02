-- 0119 · 한 계정이 같은 GA의 지점을 여러 개 등록할 수 있게 한다
--
-- 컴패니언 담당자 문의(2026-08-19 카톡): 「한 아이디로 여러개 지점 등록이 가능할까요?」
-- 오너 지시(2026-08-27): 「빨리 해결해라 너가 직접 다 해둬」
--
-- 🔴 지금까지는 **계정당 지점 하나**였다.
--    submit_branch_registration / _incomplete 둘 다 `ga_company_id is not null` 이면
--    ALREADY_HAS_COMPANY 를 던진다. 컴패니언처럼 사무실이 10곳인 곳은 **두 번째부터 못 올린다.**
--    그래서 운영팀이 대신 만들어 주고 매니저로 위임해야 했다 — 우리가 병목이 된다.
--
-- 바꾸는 규칙
--   첫 등록      기존과 동일. 회사를 찾거나 만들고 ga_admin_users 에 회사·지점을 붙인다
--   추가 등록    **자기 회사에만** 만들 수 있다. 새 회사는 만들지 않는다
--                ga_admin_users.branch_id 는 **건드리지 않는다** —
--                덮어쓰면 첫 지점의 지점장 권한을 잃는다(0115 의 판정 규칙 참고)
--                대신 ga_branch_admins 에 행을 넣어 새 지점도 관리하게 한다
--
-- ⚠️ 다른 회사 이름으로 추가 등록하려 하면 GA_NAME_MISMATCH 로 막는다.
--    막지 않으면 한 계정이 남의 GA 밑에 지점을 만들 수 있다.

create or replace function public.submit_branch_registration(
  p_ga_name text, p_branch_slug text, p_branch_name text, p_region_id uuid,
  p_manager_name text, p_address text, p_address_detail text,
  p_registrant_name text, p_registrant_title text, p_registrant_phone text,
  p_registrant_company text, p_registrant_branch_label text,
  p_intro_text text default null, p_planner_count integer default null,
  p_parking_available boolean default null, p_visit_consult_available boolean default null,
  p_business_hours text default null, p_lat double precision default null,
  p_lng double precision default null, p_tagline text default null,
  p_new_recruit_training boolean default null, p_experienced_hire boolean default null,
  p_db_support boolean default null, p_settlement_support boolean default null
)
returns table(registration_id uuid, ga_company_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin public.ga_admin_users;
  v_company public.ga_company;
  v_company_id uuid;
  v_is_new_company boolean := false;
  v_is_additional  boolean := false;
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

  if v_admin.ga_company_id is not null then
    -- ── 추가 등록: 자기 회사에만 ────────────────────────────
    v_is_additional := true;
    v_company_id := v_admin.ga_company_id;
    select * into v_company from public.ga_company where id = v_company_id;
    if v_company.name is distinct from v_ga_name then
      raise exception 'GA_NAME_MISMATCH';
    end if;
  else
    -- ── 첫 등록: 기존 동작 그대로 ───────────────────────────
    select * into v_company from public.ga_company where name = v_ga_name;
    if v_company.id is not null then
      v_company_id := v_company.id;
    else
      v_is_new_company := true;
      v_slug_base := trim(both '-' from regexp_replace(lower(v_ga_name), '[^a-z0-9가-힣]+', '-', 'g'));
      if v_slug_base = '' then v_slug_base := 'ga'; end if;
      v_slug := v_slug_base;
      while exists (select 1 from public.ga_company where slug = v_slug) loop
        v_suffix := v_suffix + 1;
        v_slug := v_slug_base || '-' || v_suffix;
      end loop;
      insert into public.ga_company (slug, name) values (v_slug, v_ga_name)
      returning id into v_company_id;
    end if;
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

  if v_is_additional then
    -- 🔴 branch_id 를 덮어쓰지 않는다. 덮어쓰면 첫 지점의 지점장 권한을 잃는다.
    insert into public.ga_branch_admins (ga_admin_user_id, branch_id)
    values (v_admin.id, v_branch_id)
    on conflict (ga_admin_user_id, branch_id) do nothing;
  else
    update public.ga_admin_users
    set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
    where id = v_admin.id;
  end if;

  insert into public.branch_registrations (
    request_type, branch_id, ga_company_id, submitted_by_ga_admin_id,
    registrant_name, registrant_title, registrant_phone, registrant_company, registrant_branch_label,
    payload
  ) values (
    'create', v_branch_id, v_company_id, v_admin.id,
    trim(p_registrant_name), trim(p_registrant_title), trim(p_registrant_phone), trim(p_registrant_company), trim(p_registrant_branch_label),
    jsonb_build_object('branchName', p_branch_name, 'gaName', v_ga_name)
  ) returning id into v_registration_id;

  return query select v_registration_id, v_company_id, v_branch_id;
end;
$function$;

-- 미완성 제출(사진 없이 먼저 올리는 경로)도 같은 규칙으로 맞춘다.
create or replace function public.submit_branch_registration_incomplete(
  p_ga_name text, p_branch_slug text, p_branch_name text, p_region_id uuid,
  p_manager_name text, p_address text, p_address_detail text,
  p_registrant_name text, p_registrant_title text, p_registrant_phone text,
  p_registrant_company text, p_registrant_branch_label text,
  p_intro_text text default null, p_planner_count integer default null,
  p_parking_available boolean default null, p_visit_consult_available boolean default null,
  p_business_hours text default null, p_lat double precision default null,
  p_lng double precision default null, p_tagline text default null,
  p_new_recruit_training boolean default null, p_experienced_hire boolean default null,
  p_db_support boolean default null, p_settlement_support boolean default null
)
returns table(registration_id uuid, ga_company_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin public.ga_admin_users;
  v_company public.ga_company;
  v_company_id uuid;
  v_is_new_company boolean := false;
  v_is_additional  boolean := false;
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

  if v_admin.ga_company_id is not null then
    v_is_additional := true;
    v_company_id := v_admin.ga_company_id;
    select * into v_company from public.ga_company where id = v_company_id;
    if v_company.name is distinct from v_ga_name then
      raise exception 'GA_NAME_MISMATCH';
    end if;
  else
    select * into v_company from public.ga_company where name = v_ga_name;
    if v_company.id is not null then
      v_company_id := v_company.id;
    else
      v_is_new_company := true;
      v_slug_base := trim(both '-' from regexp_replace(lower(v_ga_name), '[^a-z0-9가-힣]+', '-', 'g'));
      if v_slug_base = '' then v_slug_base := 'ga'; end if;
      v_slug := v_slug_base;
      while exists (select 1 from public.ga_company where slug = v_slug) loop
        v_suffix := v_suffix + 1;
        v_slug := v_slug_base || '-' || v_suffix;
      end loop;
      insert into public.ga_company (slug, name) values (v_slug, v_ga_name)
      returning id into v_company_id;
    end if;
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

  if v_is_additional then
    insert into public.ga_branch_admins (ga_admin_user_id, branch_id)
    values (v_admin.id, v_branch_id)
    on conflict (ga_admin_user_id, branch_id) do nothing;
  else
    update public.ga_admin_users
    set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
    where id = v_admin.id;
  end if;

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
$function$;
