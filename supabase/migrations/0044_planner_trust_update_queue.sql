-- =========================================================
-- 0044_planner_trust_update_queue.sql
-- 설계사 마켓 프로필 수정을 "즉시 반영 항목"과 "재승인 항목"으로 분리한다(item 12).
-- 지금까지는 update_planner_market_profile 하나가 모든 필드를 한번에 반영하면서 매번
-- status를 pending_review로 되돌려 프로필 전체가 재검수 대상이 됐다 - 연락처 하나만
--고쳐도 검색결과에서 사라지는 부작용이 있었다.
--
--   - 즉시 반영: 이름/연락처/이메일/카카오톡/사진/전문분야/현재근무여부/구직상태/
--     희망입사시기/연락가능시간/자기소개/희망지역/희망조건
--   - 재승인 대상: 활동지역/경력/희망 GA (연봉 인증은 이미 0038의 planner_badges
--     큐로 별도 심사되고 있어 여기서 다루지 않는다)
--
-- branch_registrations(0022/0043)와 동일한 draft→pending→승인/반려 패턴을 쓰되, 설계사
-- 프로필은 1인당 1행이라 별도 큐 테이블 대신 planner_profiles에 pending_* 컬럼을 얹는
-- 더 가벼운 방식으로 구현한다(엔티티당 단일 열린 요청만 존재할 수 있어 중복 방지 인덱스가
-- 필요 없다).
--
-- 0042 적용 후 실행.
-- =========================================================

alter table public.planner_profiles
  add column if not exists pending_active_region_id uuid references public.regions(id),
  add column if not exists pending_career_years int,
  add column if not exists pending_desired_ga_company_id uuid references public.ga_company(id),
  add column if not exists trust_update_status text not null default 'none'
    check (trust_update_status in ('none', 'draft', 'pending')),
  add column if not exists trust_before_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists trust_reviewed_by_admin_id uuid references public.admin_users(id),
  add column if not exists trust_reviewed_at timestamptz,
  add column if not exists trust_review_reason text;

create index if not exists idx_planner_profiles_trust_update_status
  on public.planner_profiles(trust_update_status) where trust_update_status = 'pending';

-- 0042의 update_planner_market_profile은 모든 필드(즉시반영+재승인 대상)를 한 RPC로
-- 묶어 매번 전체 재승인을 요구했다 - 아래 update_planner_market_profile_instant +
-- submit_planner_trust_update 두 개로 대체되므로 제거한다(호출부는 src/lib/actions/
-- planner-market.ts에서 함께 교체).
drop function if exists public.update_planner_market_profile(
  uuid, text, text, text, uuid, int, text[], boolean, text, text, text[], text, text, text, uuid, uuid, text
);

-- ---------------------------------------------------------
-- 즉시 반영 - 소유자만, 재승인 없이 저장 즉시 반영된다. status/재승인 필드는 건드리지
-- 않는다(공개 노출 여부는 여전히 status='approved'로만 결정됨).
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
  uuid, text, text, text, text[], boolean, text, text, text[], text, text, text, uuid, text
) to authenticated;

-- ---------------------------------------------------------
-- 재승인 대상 스냅샷 - 활동지역/경력/희망 GA의 "현재 값"을 찍는다.
-- ---------------------------------------------------------
create or replace function public.planner_trust_snapshot(p_planner_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'activeRegionId', p.active_region_id,
    'careerYears', p.career_years,
    'desiredGaCompanyId', p.desired_ga_company_id
  )
  from public.planner_profiles p where p.id = p_planner_profile_id;
$$;

-- ---------------------------------------------------------
-- 임시저장 - draft로 보관. 이미 pending이면 그 값만 갱신하고 상태는 유지.
-- ---------------------------------------------------------
create or replace function public.save_planner_trust_update_draft(
  p_planner_profile_id uuid,
  p_active_region_id uuid,
  p_career_years int,
  p_desired_ga_company_id uuid default null
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

  update public.planner_profiles set
    pending_active_region_id = p_active_region_id,
    pending_career_years = p_career_years,
    pending_desired_ga_company_id = p_desired_ga_company_id,
    trust_update_status = case when trust_update_status = 'pending' then 'pending' else 'draft' end,
    trust_before_snapshot = case
      when trust_update_status = 'none' then public.planner_trust_snapshot(p_planner_profile_id)
      else trust_before_snapshot
    end,
    updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.save_planner_trust_update_draft(uuid, uuid, int, uuid) to authenticated;

-- ---------------------------------------------------------
-- 제출 - draft/none/pending 어느 상태에서든 호출 가능. 항상 pending으로 만들고, 매번
-- 라이브 값으로 before_snapshot을 새로 찍어 이력을 정확하게 유지한다(관리자는 항상
-- 최신 제출 내용만 검토).
-- ---------------------------------------------------------
create or replace function public.submit_planner_trust_update(
  p_planner_profile_id uuid,
  p_active_region_id uuid,
  p_career_years int,
  p_desired_ga_company_id uuid default null
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
  if not exists (select 1 from public.regions where id = p_active_region_id) then
    raise exception 'INVALID_REGION';
  end if;

  update public.planner_profiles set
    pending_active_region_id = p_active_region_id,
    pending_career_years = greatest(coalesce(p_career_years, 0), 0),
    pending_desired_ga_company_id = p_desired_ga_company_id,
    trust_update_status = 'pending',
    trust_before_snapshot = public.planner_trust_snapshot(p_planner_profile_id),
    updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.submit_planner_trust_update(uuid, uuid, int, uuid) to authenticated;

-- ---------------------------------------------------------
-- 관리자 승인/반려
-- ---------------------------------------------------------
create or replace function public.admin_review_planner_trust_update(
  p_planner_profile_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_profile public.planner_profiles;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_profile from public.planner_profiles where id = p_planner_profile_id;
  if v_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_profile.trust_update_status <> 'pending' then
    raise exception 'NO_PENDING_TRUST_UPDATE';
  end if;

  if p_decision = 'approved' then
    update public.planner_profiles set
      active_region_id = coalesce(pending_active_region_id, active_region_id),
      career_years = coalesce(pending_career_years, career_years),
      desired_ga_company_id = pending_desired_ga_company_id,
      pending_active_region_id = null, pending_career_years = null, pending_desired_ga_company_id = null,
      trust_update_status = 'none',
      trust_reviewed_by_admin_id = v_admin_id, trust_reviewed_at = now(),
      trust_review_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
    where id = p_planner_profile_id;
  else
    update public.planner_profiles set
      pending_active_region_id = null, pending_career_years = null, pending_desired_ga_company_id = null,
      trust_update_status = 'none',
      trust_reviewed_by_admin_id = v_admin_id, trust_reviewed_at = now(),
      trust_review_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
    where id = p_planner_profile_id;
  end if;
end;
$$;

grant execute on function public.admin_review_planner_trust_update(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select trust_update_status, count(*) from public.planner_profiles group by 1;
-- select proname from pg_proc where proname in (
--   'update_planner_market_profile_instant','planner_trust_snapshot',
--   'save_planner_trust_update_draft','submit_planner_trust_update','admin_review_planner_trust_update'
-- );
