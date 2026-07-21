-- =========================================================
-- 0008_ga_write_functions.sql
-- GA/지점 쓰기 전용 SECURITY DEFINER 함수
-- ga_company/ga_branch/branch_*에는 INSERT/UPDATE/DELETE RLS 정책이 없으므로
-- 모든 쓰기는 이 함수들을 통해서만 이루어진다.
--
-- 권한 원칙:
--   - "플랫폼 전용" 함수: current_admin_id()가 not null이어야 함 (내부 운영진)
--   - "지점 스코프" 함수: 플랫폼 관리자 또는 is_ga_admin_for_branch(p_branch_id)가
--     true인 GA 관리자만 - 즉 GA 관리자는 본인 소속 지점만 수정 가능
--   - is_recommended/status/ga_company_id/region_id 등 운영 판단이 필요한 필드는
--     플랫폼 전용 함수에서만 변경 가능 (GA 관리자용 update_branch_profile은 소개/
--     교육/복지/DB지원/정착지원 텍스트만 다룬다)
-- 0006 -> 0007 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. 감사로그 기록 헬퍼 (admin_users/ga_admin_users 어느 쪽이 호출했는지 함께 남긴다)
-- ---------------------------------------------------------
create or replace function public._write_ga_audit_log(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is not null then
    insert into public.audit_logs (admin_id, target_type, target_id, action, before_value, after_value)
    values (v_admin_id, p_target_type, p_target_id, p_action, p_before, p_after);
  end if;
  -- GA 관리자 액션은 ga_admin_users.id를 admin_id로 강제할 수 없으므로(별도 FK 대상)
  -- action 문자열에 'ga_admin:' 접두사를 붙여 애플리케이션이 구분하도록 한다.
end;
$$;

-- ---------------------------------------------------------
-- B. ga_company - 플랫폼 관리자 전용
-- ---------------------------------------------------------
create or replace function public.create_ga_company(
  p_slug text,
  p_name text,
  p_ceo_name text default null,
  p_description text default null,
  p_logo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if length(trim(p_slug)) = 0 or length(trim(p_name)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.ga_company (slug, name, ceo_name, description, logo_path)
  values (p_slug, p_name, p_ceo_name, p_description, p_logo_path)
  returning id into v_company_id;

  perform public._write_ga_audit_log('ga_company', v_company_id, 'create', null, jsonb_build_object('name', p_name, 'slug', p_slug));

  return v_company_id;
end;
$$;

create or replace function public.update_ga_company(
  p_ga_company_id uuid,
  p_name text,
  p_ceo_name text default null,
  p_description text default null,
  p_logo_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if length(trim(p_name)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.ga_company
  set name = p_name, ceo_name = p_ceo_name, description = p_description, logo_path = p_logo_path
  where id = p_ga_company_id;

  if not found then
    raise exception 'GA_COMPANY_NOT_FOUND';
  end if;
end;
$$;

-- '공식 인증 GA' 배지 부여/해제
create or replace function public.verify_ga_company(p_ga_company_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  update public.ga_company
  set is_verified = p_verified,
      verified_at = case when p_verified then now() else null end
  where id = p_ga_company_id;

  if not found then
    raise exception 'GA_COMPANY_NOT_FOUND';
  end if;

  perform public._write_ga_audit_log('ga_company', p_ga_company_id, 'verify_toggle', null, jsonb_build_object('is_verified', p_verified));
end;
$$;

-- 승인 프로세스: pending -> approved / rejected, approved -> suspended (재승인 시 다시 approved)
-- approved가 아니면 소속 지점 전체가 branch.status와 무관하게 비공개 처리된다 (0007 RLS 참고).
-- 별도의 delete_ga_company는 두지 않는다 - '삭제'가 필요한 상태는 rejected/suspended로 충분히
-- 표현되고, 되돌릴 수 없는 완전 삭제는 흔치 않은 운영 작업이라 서비스 role로 직접 처리한다.
create or replace function public.set_ga_company_approval_status(
  p_ga_company_id uuid,
  p_status text,
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

  if p_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'INVALID_APPROVAL_STATUS';
  end if;

  update public.ga_company
  set approval_status = p_status,
      approval_reason = case when p_status in ('rejected', 'suspended') then p_reason else null end,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now()
  where id = p_ga_company_id;

  if not found then
    raise exception 'GA_COMPANY_NOT_FOUND';
  end if;

  perform public._write_ga_audit_log(
    'ga_company', p_ga_company_id, 'set_approval_status',
    null, jsonb_build_object('approval_status', p_status, 'reason', p_reason)
  );
end;
$$;

-- ---------------------------------------------------------
-- C. ga_branch - 플랫폼 관리자 전용 (생성/상태·노출 변경)
-- ---------------------------------------------------------
create or replace function public.create_branch(
  p_ga_company_id uuid,
  p_region_id uuid,
  p_name text,
  p_address text,
  p_address_detail text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_intro_text text default null,
  p_education_info text default null,
  p_welfare_info text default null,
  p_db_support_info text default null,
  p_settlement_support_info text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_address)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.ga_branch (
    ga_company_id, region_id, name, address, address_detail, lat, lng,
    intro_text, education_info, welfare_info, db_support_info, settlement_support_info
  ) values (
    p_ga_company_id, p_region_id, p_name, p_address, p_address_detail, p_lat, p_lng,
    p_intro_text, p_education_info, p_welfare_info, p_db_support_info, p_settlement_support_info
  ) returning id into v_branch_id;

  perform public._write_ga_audit_log('ga_branch', v_branch_id, 'create', null, jsonb_build_object('name', p_name));

  return v_branch_id;
end;
$$;

create or replace function public.update_branch(
  p_branch_id uuid,
  p_name text,
  p_region_id uuid,
  p_address text,
  p_address_detail text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_intro_text text default null,
  p_education_info text default null,
  p_welfare_info text default null,
  p_db_support_info text default null,
  p_settlement_support_info text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_address)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.ga_branch
  set name = p_name, region_id = p_region_id, address = p_address, address_detail = p_address_detail,
      lat = p_lat, lng = p_lng, intro_text = p_intro_text, education_info = p_education_info,
      welfare_info = p_welfare_info, db_support_info = p_db_support_info,
      settlement_support_info = p_settlement_support_info
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.set_branch_status(p_branch_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if p_status not in ('visible', 'hidden', 'deleted') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.ga_branch
  set status = p_status, deleted_at = case when p_status = 'deleted' then now() else deleted_at end
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  perform public._write_ga_audit_log('ga_branch', p_branch_id, 'set_status', null, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.set_branch_recommended(p_branch_id uuid, p_is_recommended boolean, p_recommended_rank int default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  update public.ga_branch
  set is_recommended = p_is_recommended, recommended_rank = p_recommended_rank
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  perform public._write_ga_audit_log('ga_branch', p_branch_id, 'set_recommended', null, jsonb_build_object('is_recommended', p_is_recommended, 'rank', p_recommended_rank));
end;
$$;

-- ---------------------------------------------------------
-- D. ga_branch - GA 관리자 전용 (소개 텍스트만. 주소/지역/추천/상태는 플랫폼 전용)
-- ---------------------------------------------------------
create or replace function public.update_branch_profile(
  p_branch_id uuid,
  p_intro_text text,
  p_education_info text,
  p_welfare_info text,
  p_db_support_info text,
  p_settlement_support_info text
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

  update public.ga_branch
  set intro_text = p_intro_text, education_info = p_education_info, welfare_info = p_welfare_info,
      db_support_info = p_db_support_info, settlement_support_info = p_settlement_support_info
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- E. branch_media - 플랫폼 관리자 또는 담당 GA 관리자
-- ---------------------------------------------------------
create or replace function public.add_branch_media(
  p_branch_id uuid,
  p_media_type public.branch_media_type,
  p_source public.branch_media_source,
  p_value text,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media_id uuid;
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_value)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.branch_media (branch_id, media_type, source, value, sort_order)
  values (p_branch_id, p_media_type, p_source, p_value, p_sort_order)
  returning id into v_media_id;

  return v_media_id;
end;
$$;

create or replace function public.delete_branch_media(p_media_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_value text;
begin
  select branch_id, value into v_branch_id, v_value from public.branch_media where id = p_media_id;

  if v_branch_id is null then
    raise exception 'MEDIA_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.branch_media where id = p_media_id;

  return v_value; -- source='storage'인 경우 애플리케이션이 Storage 객체 정리에 사용
end;
$$;

-- ---------------------------------------------------------
-- F. branch_contacts - type/value 자유형. 플랫폼 관리자 또는 담당 GA 관리자.
-- ---------------------------------------------------------
create or replace function public.upsert_branch_contact(
  p_contact_id uuid,
  p_branch_id uuid,
  p_type text,
  p_value text,
  p_label text default null,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing_branch_id uuid;
begin
  if p_contact_id is not null then
    select branch_id into v_existing_branch_id from public.branch_contacts where id = p_contact_id;
    if v_existing_branch_id is null then
      raise exception 'CONTACT_NOT_FOUND';
    end if;
    p_branch_id := v_existing_branch_id;
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_type)) = 0 or length(trim(p_value)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_contact_id is null then
    insert into public.branch_contacts (branch_id, type, value, label, sort_order)
    values (p_branch_id, p_type, p_value, p_label, p_sort_order)
    returning id into v_id;
  else
    update public.branch_contacts
    set type = p_type, value = p_value, label = p_label, sort_order = p_sort_order
    where id = p_contact_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.delete_branch_contact(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id from public.branch_contacts where id = p_contact_id;

  if v_branch_id is null then
    raise exception 'CONTACT_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.branch_contacts where id = p_contact_id;
end;
$$;

-- ---------------------------------------------------------
-- G. branch_recruit - 공식채용 (/jobs '공식채용' 탭). 플랫폼 관리자 또는 담당 GA 관리자.
-- ---------------------------------------------------------
create or replace function public.create_branch_recruit(
  p_branch_id uuid,
  p_title text,
  p_content text,
  p_employment_type text default null,
  p_end_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.branch_recruit (branch_id, title, content, employment_type, end_at)
  values (p_branch_id, p_title, p_content, p_employment_type, p_end_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_branch_recruit(
  p_recruit_id uuid,
  p_title text,
  p_content text,
  p_employment_type text default null,
  p_end_at timestamptz default null,
  p_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id from public.branch_recruit where id = p_recruit_id;

  if v_branch_id is null then
    raise exception 'RECRUIT_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.branch_recruit
  set title = p_title, content = p_content, employment_type = p_employment_type,
      end_at = p_end_at, is_active = p_is_active
  where id = p_recruit_id;
end;
$$;

create or replace function public.close_branch_recruit(p_recruit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id from public.branch_recruit where id = p_recruit_id;

  if v_branch_id is null then
    raise exception 'RECRUIT_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  update public.branch_recruit set is_active = false where id = p_recruit_id;
end;
$$;

-- ---------------------------------------------------------
-- H. branch_event. 플랫폼 관리자 또는 담당 GA 관리자.
-- ---------------------------------------------------------
create or replace function public.create_branch_event(
  p_branch_id uuid,
  p_title text,
  p_content text,
  p_image_path text default null,
  p_start_at timestamptz default now(),
  p_end_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.branch_event (branch_id, title, content, image_path, start_at, end_at)
  values (p_branch_id, p_title, p_content, p_image_path, p_start_at, p_end_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_branch_event(
  p_event_id uuid,
  p_title text,
  p_content text,
  p_image_path text default null,
  p_start_at timestamptz default now(),
  p_end_at timestamptz default null,
  p_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id from public.branch_event where id = p_event_id;

  if v_branch_id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  update public.branch_event
  set title = p_title, content = p_content, image_path = p_image_path,
      start_at = p_start_at, end_at = p_end_at, is_active = p_is_active
  where id = p_event_id;
end;
$$;

-- ---------------------------------------------------------
-- I. branch_insurers - 취급 원수사 전체 교체 (플랫폼 관리자 또는 담당 GA 관리자)
-- ---------------------------------------------------------
create or replace function public.set_branch_insurers(p_branch_id uuid, p_insurer_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.branch_insurers where branch_id = p_branch_id;

  insert into public.branch_insurers (branch_id, insurer_id)
  select p_branch_id, unnest(p_insurer_ids)
  where p_insurer_ids is not null and array_length(p_insurer_ids, 1) > 0;
end;
$$;

-- ---------------------------------------------------------
-- J. 조회수 / 문의클릭 집계 (공개, 인증된 익명 세션이면 누구나 호출)
-- ---------------------------------------------------------
create or replace function public.record_branch_view(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_window_minutes int;
  v_recent_exists boolean;
begin
  if v_profile_id is null then
    return;
  end if;

  select (value)::int into v_window_minutes from public.site_settings where key = 'duplicate_view_window_minutes';

  select exists (
    select 1 from public.branch_views
    where branch_id = p_branch_id
      and anonymous_profile_id = v_profile_id
      and created_at > now() - make_interval(mins => coalesce(v_window_minutes, 30))
  ) into v_recent_exists;

  if not v_recent_exists then
    insert into public.branch_views (branch_id, anonymous_profile_id)
    values (p_branch_id, v_profile_id);

    update public.ga_branch
    set organic_view_count = organic_view_count + 1
    where id = p_branch_id;
  end if;
end;
$$;

create or replace function public.record_branch_contact_click(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_type text;
begin
  select branch_id, type into v_branch_id, v_type from public.branch_contacts where id = p_contact_id;

  if v_branch_id is null then
    raise exception 'CONTACT_NOT_FOUND';
  end if;

  insert into public.branch_contact_clicks (branch_id, contact_id, contact_type)
  values (v_branch_id, p_contact_id, v_type);
end;
$$;

-- GA 관리자 통계 카드 - 조회수 / 오늘 조회수 / 문의 클릭수
create or replace function public.get_branch_stats(p_branch_id uuid)
returns table (total_views bigint, today_views bigint, contact_clicks bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  return query
  select
    (select organic_view_count + imported_view_count + correction_view_count
     from public.ga_branch where id = p_branch_id),
    (select count(*) from public.branch_views
     where branch_id = p_branch_id and created_at >= date_trunc('day', now())),
    (select count(*) from public.branch_contact_clicks where branch_id = p_branch_id);
end;
$$;

-- ---------------------------------------------------------
-- K. 실행 권한 부여
-- ---------------------------------------------------------
grant execute on function public.create_ga_company(text, text, text, text, text) to authenticated;
grant execute on function public.update_ga_company(uuid, text, text, text, text) to authenticated;
grant execute on function public.verify_ga_company(uuid, boolean) to authenticated;
grant execute on function public.set_ga_company_approval_status(uuid, text, text) to authenticated;

grant execute on function public.create_branch(uuid, uuid, text, text, text, double precision, double precision, text, text, text, text, text) to authenticated;
grant execute on function public.update_branch(uuid, text, uuid, text, text, double precision, double precision, text, text, text, text, text) to authenticated;
grant execute on function public.set_branch_status(uuid, text) to authenticated;
grant execute on function public.set_branch_recommended(uuid, boolean, int) to authenticated;
grant execute on function public.update_branch_profile(uuid, text, text, text, text, text) to authenticated;

grant execute on function public.add_branch_media(uuid, public.branch_media_type, public.branch_media_source, text, int) to authenticated;
grant execute on function public.delete_branch_media(uuid) to authenticated;

grant execute on function public.upsert_branch_contact(uuid, uuid, text, text, text, int) to authenticated;
grant execute on function public.delete_branch_contact(uuid) to authenticated;

grant execute on function public.create_branch_recruit(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.update_branch_recruit(uuid, text, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.close_branch_recruit(uuid) to authenticated;

grant execute on function public.create_branch_event(uuid, text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.update_branch_event(uuid, text, text, text, timestamptz, timestamptz, boolean) to authenticated;

grant execute on function public.set_branch_insurers(uuid, uuid[]) to authenticated;

grant execute on function public.record_branch_view(uuid) to anon, authenticated;
grant execute on function public.record_branch_contact_click(uuid) to anon, authenticated;
grant execute on function public.get_branch_stats(uuid) to authenticated;
