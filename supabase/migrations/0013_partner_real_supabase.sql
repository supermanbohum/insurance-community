-- =========================================================
-- 0013_partner_real_supabase.sql
-- GA 파트너(회원가입/로그인/GA 자체등록/지점등록/수정)를 mockStore가 아닌
-- 실제 Supabase Auth + DB로 전환한다.
--
-- 배경: 파트너 세션과 등록 데이터가 서버 메모리(mockStore)에만 있어 Vercel의
-- 서버리스 인스턴스가 바뀔 때마다 사라졌다 - 그 결과 등록 직후 다음 요청이
-- 다른 인스턴스로 가면 404(notFound())로 이어졌다. 이 마이그레이션으로
-- ga_admin_users/ga_company/ga_branch를 실제로 읽고 쓰도록 만든다.
--
-- 0006~0012 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. ga_admin_users.ga_company_id를 nullable로 변경
--    (회원가입 직후에는 아직 GA를 등록하기 전이라 반드시 null이어야 한다)
-- ---------------------------------------------------------
alter table public.ga_admin_users alter column ga_company_id drop not null;

-- ---------------------------------------------------------
-- B. 회원가입 직후 본인 ga_admin_users 행 생성(멱등) - INSERT 정책 대신 함수로만 허용.
--    이메일 확인(confirmation)이 켜져 있어 signUp 직후 세션이 없을 수도 있으므로,
--    로그인 성공 시에도 다시 호출해 존재를 보장한다(이미 있으면 그대로 반환).
-- ---------------------------------------------------------
create or replace function public.signup_ga_admin(p_display_name text default null)
returns public.ga_admin_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_row public.ga_admin_users;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from public.ga_admin_users where auth_user_id = auth.uid();
  if v_row.id is not null then
    return v_row;
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.ga_admin_users (auth_user_id, ga_company_id, branch_id, email, display_name, is_active)
  values (auth.uid(), null, null, v_email, coalesce(nullif(trim(p_display_name), ''), 'GA 관리자'), true)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------
-- C. GA 자체등록 - 회사 + 첫 지점(본사)을 한 번에 만들고 호출자 계정에 연결한다.
--    승인 상태는 ga_company의 기본값(pending)을 그대로 따른다.
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
  p_business_hours text default null
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
    operation_type, is_headquarters
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', true
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  return query select v_company_id, v_branch_id;
end;
$$;

-- ---------------------------------------------------------
-- D. 추가 지점 등록 - 이미 GA를 등록한 파트너가 두 번째 이후 지점을 추가.
--    소속 GA가 이미 승인된 상태면 관리자 재검토 전까지 hidden으로 대기.
-- ---------------------------------------------------------
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
  p_business_hours text default null
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
    operation_type, is_headquarters, status
  ) values (
    v_admin.ga_company_id, p_region_id, trim(p_slug), trim(p_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', false,
    case when v_company.approval_status = 'approved' then 'hidden' else 'visible' end
  ) returning id into v_branch_id;

  return v_branch_id;
end;
$$;

-- ---------------------------------------------------------
-- E. 파트너 본인 GA 정보 수정 (이름/대표자/소개)
-- ---------------------------------------------------------
create or replace function public.update_partner_ga_company(
  p_name text,
  p_ceo_name text default null,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null or v_admin.ga_company_id is null then
    raise exception 'NOT_GA_ADMIN_WITH_COMPANY';
  end if;

  if length(trim(p_name)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.ga_company
  set name = trim(p_name),
      ceo_name = nullif(trim(coalesce(p_ceo_name, '')), ''),
      description = nullif(trim(coalesce(p_description, '')), '')
  where id = v_admin.ga_company_id;
end;
$$;

-- ---------------------------------------------------------
-- F. 파트너 본인 지점 기본정보 수정 (이름/지역/주소/소개류/설계사수/주차/방문상담/영업시간)
--    admin 전용 update_branch와 필드는 같지만 권한 체크가 is_ga_admin_for_branch다.
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
  p_business_hours text default null
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
      business_hours = nullif(trim(coalesce(p_business_hours, '')), '')
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- G. 실행 권한 부여
-- ---------------------------------------------------------
grant execute on function public.signup_ga_admin(text) to authenticated;
grant execute on function public.register_ga_for_partner(text, text, text, text, text, text, uuid, text, text, text, text, int, boolean, boolean, text) to authenticated;
grant execute on function public.create_partner_branch(text, text, uuid, text, text, text, text, int, boolean, boolean, text) to authenticated;
grant execute on function public.update_partner_ga_company(text, text, text) to authenticated;
grant execute on function public.update_partner_branch(uuid, text, uuid, text, text, text, text, text, text, text, int, boolean, boolean, text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 사용자가 직접 검증)
-- ---------------------------------------------------------
-- select column_name, is_nullable from information_schema.columns where table_name = 'ga_admin_users' and column_name = 'ga_company_id';
-- select proname from pg_proc where proname in ('signup_ga_admin','register_ga_for_partner','create_partner_branch','update_partner_ga_company','update_partner_branch');
