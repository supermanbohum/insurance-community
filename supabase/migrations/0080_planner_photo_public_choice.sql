-- =========================================================
-- 0080_planner_photo_public_choice.sql (W-088, P1)
-- 오너 지시(2026-08-07, 오늘 재확인): "top설계사 및 연봉랭킹 사진은 해당 설계사가
-- 프로필사진 공개/비공개 여부를 결정할 수 있도록 등록화면에 선택지를 주는 걸로
-- 하세요" + "top설계사 와 랭킹은 비공개 선택 시 열람권을 사용해도 볼 수 없다.
-- 열람권은 어디까지나 설계사찾기에만 사용하는 용도이다."
--
-- CTO 실측 결과 이 선택지 자체가 지금까지 만들어진 적이 없었다(planner_profiles에
-- 공개/비공개 컬럼 부재, public_top_designer_certifications·
-- public_salary_ranking_submissions 둘 다 사진을 무조건 노출). 버그가 아니라 오너
-- 기지시 미구현.
--
-- 🔴 기본값을 두지 않는다(오너 지시 - "선택지를 주는" 것이지 옵트아웃이 아니다).
-- nullable로 두고 null은 비공개로 취급한다 - 사진을 올리고도 선택을 안 하면
-- 안전한 쪽(비공개)으로 떨어진다. 서버(RPC)에서도 "사진 있는데 선택 안 함"을
-- 명시적으로 거부해 클라이언트 우회를 막는다.
--
-- 열람권(설계사찾기 크레딧 언락)은 이 두 테이블/뷰를 참조하는 코드가 전혀 없다
-- (0036/0045 확인 - grep 0건) - 애초에 우회 경로 자체가 존재하지 않는다.
-- =========================================================

alter table public.planner_profiles
  add column if not exists photo_public boolean;

-- ---------------------------------------------------------
-- 신규 등록 - 사진이 있는데 공개 여부를 선택 안 하면 거부한다.
-- ---------------------------------------------------------
create or replace function public.submit_planner_market_profile(
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_currently_employed boolean,
  p_open_to_move boolean,
  p_consent_contact_paid_view boolean,
  p_consent_recruit_contact boolean,
  p_consent_privacy_policy boolean,
  p_consent_third_party_share boolean,
  p_consent_withdrawal_notice boolean,
  p_kakao_id text default null,
  p_profile_photo_path text default null,
  p_self_introduction text default null,
  p_desired_region_id uuid default null,
  p_desired_ga_company_id uuid default null,
  p_desired_conditions text default null,
  p_photo_public boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
begin
  if not public.is_full_member() then
    raise exception 'NOT_FULL_MEMBER';
  end if;
  v_user_id := public.current_member_id();

  if exists (select 1 from public.planner_profiles where user_id = v_user_id and withdrawn_at is null) then
    raise exception 'PROFILE_ALREADY_EXISTS';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_phone)) = 0 or length(trim(p_email)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if not exists (select 1 from public.regions where id = p_active_region_id) then
    raise exception 'INVALID_REGION';
  end if;
  if not (
    p_consent_contact_paid_view and p_consent_recruit_contact and p_consent_privacy_policy
    and p_consent_third_party_share and p_consent_withdrawal_notice
  ) then
    raise exception 'CONSENT_REQUIRED';
  end if;
  if p_profile_photo_path is not null and p_photo_public is null then
    raise exception 'PHOTO_PUBLIC_CHOICE_REQUIRED';
  end if;

  insert into public.planner_profiles (
    user_id, name, phone, email, kakao_id, profile_photo_path, photo_public,
    active_region_id, career_years, specialties, self_introduction,
    currently_employed, open_to_move, desired_region_id, desired_ga_company_id, desired_conditions,
    consent_contact_paid_view, consent_recruit_contact, consent_privacy_policy,
    consent_third_party_share, consent_withdrawal_notice, consent_agreed_at
  ) values (
    v_user_id, trim(p_name), trim(p_phone), trim(p_email), nullif(trim(coalesce(p_kakao_id, '')), ''), p_profile_photo_path, p_photo_public,
    p_active_region_id, greatest(p_career_years, 0), coalesce(p_specialties, '{}'), p_self_introduction,
    p_currently_employed, p_open_to_move, p_desired_region_id, p_desired_ga_company_id, p_desired_conditions,
    true, true, true, true, true, now()
  ) returning id into v_profile_id;

  insert into public.planner_badges (planner_profile_id, badge_type_code, status, granted_at)
  values (v_profile_id, 'verified_identity', 'approved', now())
  on conflict (planner_profile_id, badge_type_code) do nothing;

  return v_profile_id;
end;
$$;

grant execute on function public.submit_planner_market_profile(
  text, text, text, uuid, int, text[], boolean, boolean,
  boolean, boolean, boolean, boolean, boolean, text, text, text, uuid, uuid, text, boolean
) to authenticated;

-- ---------------------------------------------------------
-- 수정(즉시 반영) - 사진이 있는데 공개 여부를 선택 안 하면 거부한다.
-- ---------------------------------------------------------
create or replace function public.update_planner_market_profile_instant(
  p_planner_profile_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_specialties text[],
  p_currently_employed boolean,
  p_job_search_status text,
  p_desired_start_timing text,
  p_contactable_times text[],
  p_kakao_id text default null,
  p_profile_photo_path text default null,
  p_self_introduction text default null,
  p_desired_region_id uuid default null,
  p_desired_conditions text default null,
  p_photo_public boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.planner_profiles;
begin
  select * into v_profile from public.planner_profiles where id = p_planner_profile_id;
  if v_profile.id is null or v_profile.user_id <> public.current_member_id() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_profile.withdrawn_at is not null then
    raise exception 'PROFILE_WITHDRAWN';
  end if;
  if length(trim(p_name)) = 0 or length(trim(p_phone)) = 0 or length(trim(p_email)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_job_search_status not in ('actively_looking', 'open_to_offers', 'not_looking') then
    raise exception 'INVALID_INPUT';
  end if;
  if p_desired_start_timing is not null and p_desired_start_timing not in ('immediate', 'within_1_month', 'within_3_months', 'negotiable') then
    raise exception 'INVALID_INPUT';
  end if;
  if not (coalesce(p_contactable_times, '{}') <@ array['morning', 'afternoon', 'evening', 'weekend', 'anytime']) then
    raise exception 'INVALID_INPUT';
  end if;
  if p_profile_photo_path is not null and p_photo_public is null then
    raise exception 'PHOTO_PUBLIC_CHOICE_REQUIRED';
  end if;

  update public.planner_profiles set
    name = trim(p_name), phone = trim(p_phone), email = trim(p_email),
    kakao_id = nullif(trim(coalesce(p_kakao_id, '')), ''), profile_photo_path = p_profile_photo_path,
    photo_public = p_photo_public,
    specialties = coalesce(p_specialties, '{}'), self_introduction = p_self_introduction,
    currently_employed = p_currently_employed,
    job_search_status = p_job_search_status, desired_start_timing = p_desired_start_timing,
    contactable_times = coalesce(p_contactable_times, '{}'),
    desired_region_id = p_desired_region_id,
    desired_conditions = p_desired_conditions,
    updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.update_planner_market_profile_instant(
  uuid, text, text, text, text[], boolean, text, text, text[], text, text, text, uuid, text, boolean
) to authenticated;

-- ---------------------------------------------------------
-- TOP설계사 공개 뷰 - 비공개면 사진을 아예 반환하지 않는다(가리는 게 아니라 안 준다).
-- ---------------------------------------------------------
create or replace view public.public_top_designer_certifications
with (security_invoker = true) as
select
  c.id,
  c.planner_profile_id,
  c.job_title,
  c.star_tier,
  c.reviewed_at as certified_at,
  c.created_at,
  case when p.photo_public then p.profile_photo_path else null end as profile_photo_path,
  p.active_region_id,
  p.career_years,
  p.specialties,
  p.self_introduction,
  (select count(*) from public.top_designer_views v where v.top_designer_certification_id = c.id) as view_count,
  (select count(*) from public.top_designer_likes l where l.top_designer_certification_id = c.id) as like_count
from public.top_designer_certifications c
join public.planner_profiles p on p.id = c.planner_profile_id
where c.status = 'approved' and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_top_designer_certifications to anon, authenticated;

-- ---------------------------------------------------------
-- 연봉랭킹 공개 뷰 - 동일하게 비공개면 사진을 반환하지 않는다.
-- ---------------------------------------------------------
create or replace view public.public_salary_ranking_submissions
with (security_invoker = true) as
select
  s.id,
  s.planner_profile_id,
  s.ranking_year,
  s.job_title,
  s.display_name,
  s.confirmed_annual_income_krw as annual_income_krw,
  s.reviewed_at as ranked_at,
  s.created_at,
  case when p.photo_public then p.profile_photo_path else null end as profile_photo_path,
  p.active_region_id,
  (select count(*) from public.salary_ranking_views v where v.submission_id = s.id) as view_count
from public.salary_ranking_submissions s
join public.planner_profiles p on p.id = s.planner_profile_id
where s.status = 'approved' and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_salary_ranking_submissions to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname, pg_get_functiondef(oid) from pg_proc where proname = 'submit_planner_market_profile';
-- select column_name from information_schema.columns where table_name='planner_profiles' and column_name='photo_public';
-- select id, profile_photo_path from public.public_top_designer_certifications;  -- photo_public=false/null인 행은 profile_photo_path가 null이어야 함
-- select id, profile_photo_path from public.public_salary_ranking_submissions;
