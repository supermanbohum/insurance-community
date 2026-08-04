-- =========================================================
-- 0042_planner_market_job_search_fields.sql
-- 설계사 마켓 등록폼 필드 교체: "이직 가능 여부"(open_to_move, boolean) 삭제,
-- 대신 실제 구직 활동에 필요한 3개 필드로 대체한다.
--   - job_search_status: 현재 상태 (적극 구직중/좋은 조건이면 검토/이직 계획 없음)
--   - desired_start_timing: 희망 입사 시기 (즉시/1개월/3개월/협의)
--   - contactable_times: 연락 가능 시간 (다중선택 - 오전/오후/저녁/주말/상관없음)
-- TOP설계사(planner_certifications)와는 무관 - planner_profiles 테이블만 변경한다.
--
-- 0038 적용 후 실행.
-- =========================================================

-- public_planner_profiles 뷰가 open_to_move 컬럼을 참조하고 있어 컬럼을 먼저 드롭할 수
-- 없다. 뷰를 먼저 지우고, 맨 아래에서 새 컬럼 구성으로 다시 만든다.
drop view public.public_planner_profiles;

alter table public.planner_profiles drop column open_to_move;

alter table public.planner_profiles
  add column job_search_status text not null default 'not_looking'
    check (job_search_status in ('actively_looking', 'open_to_offers', 'not_looking')),
  add column desired_start_timing text
    check (desired_start_timing in ('immediate', 'within_1_month', 'within_3_months', 'negotiable')),
  add column contactable_times text[] not null default '{}'
    check (contactable_times <@ array['morning', 'afternoon', 'evening', 'weekend', 'anytime']);

-- ---------------------------------------------------------
-- 등록/수정 RPC 재생성 - open_to_move 파라미터를 새 3개 파라미터로 교체.
-- 파라미터 목록 자체가 바뀌므로 create or replace가 아니라 drop 후 재생성한다.
-- ---------------------------------------------------------
drop function if exists public.submit_planner_market_profile(
  text, text, text, uuid, int, text[], boolean, boolean,
  boolean, boolean, boolean, boolean, boolean, text, text, text, uuid, uuid, text
);

create function public.submit_planner_market_profile(
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_currently_employed boolean,
  p_job_search_status text,
  p_desired_start_timing text,
  p_contactable_times text[],
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
  p_desired_conditions text default null
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
  if p_job_search_status not in ('actively_looking', 'open_to_offers', 'not_looking') then
    raise exception 'INVALID_INPUT';
  end if;
  if p_desired_start_timing is not null and p_desired_start_timing not in ('immediate', 'within_1_month', 'within_3_months', 'negotiable') then
    raise exception 'INVALID_INPUT';
  end if;
  if not (coalesce(p_contactable_times, '{}') <@ array['morning', 'afternoon', 'evening', 'weekend', 'anytime']) then
    raise exception 'INVALID_INPUT';
  end if;
  if not (
    p_consent_contact_paid_view and p_consent_recruit_contact and p_consent_privacy_policy
    and p_consent_third_party_share and p_consent_withdrawal_notice
  ) then
    raise exception 'CONSENT_REQUIRED';
  end if;

  insert into public.planner_profiles (
    user_id, name, phone, email, kakao_id, profile_photo_path,
    active_region_id, career_years, specialties, self_introduction,
    currently_employed, job_search_status, desired_start_timing, contactable_times,
    desired_region_id, desired_ga_company_id, desired_conditions,
    consent_contact_paid_view, consent_recruit_contact, consent_privacy_policy,
    consent_third_party_share, consent_withdrawal_notice, consent_agreed_at
  ) values (
    v_user_id, trim(p_name), trim(p_phone), trim(p_email), nullif(trim(coalesce(p_kakao_id, '')), ''), p_profile_photo_path,
    p_active_region_id, greatest(p_career_years, 0), coalesce(p_specialties, '{}'), p_self_introduction,
    p_currently_employed, p_job_search_status, p_desired_start_timing, coalesce(p_contactable_times, '{}'),
    p_desired_region_id, p_desired_ga_company_id, p_desired_conditions,
    true, true, true, true, true, now()
  ) returning id into v_profile_id;

  insert into public.planner_badges (planner_profile_id, badge_type_code, status, granted_at)
  values (v_profile_id, 'verified_identity', 'approved', now())
  on conflict (planner_profile_id, badge_type_code) do nothing;

  return v_profile_id;
end;
$$;

grant execute on function public.submit_planner_market_profile(
  text, text, text, uuid, int, text[], boolean, text, text, text[],
  boolean, boolean, boolean, boolean, boolean, text, text, text, uuid, uuid, text
) to authenticated;

drop function if exists public.update_planner_market_profile(
  uuid, text, text, text, uuid, int, text[], boolean, boolean, text, text, text, uuid, uuid, text
);

create function public.update_planner_market_profile(
  p_planner_profile_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_currently_employed boolean,
  p_job_search_status text,
  p_desired_start_timing text,
  p_contactable_times text[],
  p_kakao_id text default null,
  p_profile_photo_path text default null,
  p_self_introduction text default null,
  p_desired_region_id uuid default null,
  p_desired_ga_company_id uuid default null,
  p_desired_conditions text default null
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

  update public.planner_profiles set
    name = trim(p_name), phone = trim(p_phone), email = trim(p_email),
    kakao_id = nullif(trim(coalesce(p_kakao_id, '')), ''), profile_photo_path = p_profile_photo_path,
    active_region_id = p_active_region_id, career_years = greatest(p_career_years, 0),
    specialties = coalesce(p_specialties, '{}'), self_introduction = p_self_introduction,
    currently_employed = p_currently_employed,
    job_search_status = p_job_search_status, desired_start_timing = p_desired_start_timing,
    contactable_times = coalesce(p_contactable_times, '{}'),
    desired_region_id = p_desired_region_id, desired_ga_company_id = p_desired_ga_company_id,
    desired_conditions = p_desired_conditions,
    status = 'pending_review', reviewed_by_admin_id = null, reviewed_at = null, review_reason = null,
    updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.update_planner_market_profile(
  uuid, text, text, text, uuid, int, text[], boolean, text, text, text[], text, text, text, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------
-- 공개 뷰 재생성 - open_to_move 컬럼 제거, 새 3개 필드 추가. (뷰는 파일 앞쪽에서 이미 drop함)
-- ---------------------------------------------------------
create view public.public_planner_profiles
with (security_invoker = true) as
select
  p.id,
  p.profile_photo_path,
  p.active_region_id,
  p.career_years,
  p.specialties,
  p.self_introduction,
  p.currently_employed,
  p.job_search_status,
  p.desired_start_timing,
  p.contactable_times,
  p.desired_region_id,
  p.desired_ga_company_id,
  p.desired_conditions,
  p.created_at,
  coalesce(badge_agg.badges, '[]'::jsonb) as badges,
  exists (
    select 1 from public.planner_badges b
    where b.planner_profile_id = p.id and b.badge_type_code = 'income_verified' and b.status = 'approved'
  ) as has_income_verified,
  exists (
    select 1 from public.planner_badges b
    where b.planner_profile_id = p.id and b.badge_type_code = 'top_planner' and b.status = 'approved'
  ) as has_top_planner
from public.planner_profiles p
left join lateral (
  select jsonb_agg(jsonb_build_object('code', bt.code, 'label', bt.label, 'icon', bt.icon) order by bt.sort_order) as badges
  from public.planner_badges b
  join public.planner_badge_types bt on bt.code = b.badge_type_code
  where b.planner_profile_id = p.id and b.status = 'approved'
) badge_agg on true
where p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_planner_profiles to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select job_search_status, desired_start_timing, contactable_times from public.planner_profiles limit 5;
-- select * from public.public_planner_profiles limit 5;
-- select proname from pg_proc where proname in ('submit_planner_market_profile','update_planner_market_profile');
