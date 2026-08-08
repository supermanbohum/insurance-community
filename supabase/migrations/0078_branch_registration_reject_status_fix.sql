-- =========================================================
-- 0078_branch_registration_reject_status_fix.sql (P1)
-- review_branch_registration()이 반려(rejected) 결정을 branch_registrations.status에는
-- 반영하면서 ga_branch.registration_status는 그대로 'pending'에 방치해왔다(0022 원본부터
-- 있던 결함, 0074에서도 재현). 승인 시(request_type='create')는 registration_status를
-- 'approved'로 바꾸면서, 반려 시에는 아무 것도 하지 않았다 - 정확히 대칭이 깨진 지점.
--
-- 실제 영향: /partner/branches/[branchId] 페이지가 registration_status로 안내문구를
-- 분기하는데('rejected' 문구가 이미 코드에 있음 - PartnerBranchEditForm 참고), 이 값이
-- 절대 'rejected'가 되지 않으니 반려된 지점도 영원히 "승인 대기 중"으로 보인다.
-- 오너 확인(2026-08-08): 메타리치 1본부·굿굿 두 건이 8/7 반려됐는데 여전히 pending으로
-- 대기열에 유령처럼 남아있음.
--
-- 0074 적용 후 실행.
-- =========================================================

create or replace function public.review_branch_registration(
  p_registration_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.branch_registrations;
  v_company public.ga_company;
  v_payload jsonb;
  v_intro_text text;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if v_reg.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  if p_decision = 'approved' and v_reg.request_type = 'create' then
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

    select * into v_company from public.ga_company where id = v_reg.ga_company_id;
    update public.ga_branch
    set registration_status = 'approved',
        status = case when v_company.approval_status = 'approved' then 'visible' else 'hidden' end,
        status_reason = null
    where id = v_reg.branch_id;

  elsif p_decision = 'rejected' and v_reg.request_type = 'create' then
    -- 반려된 신규 등록 사진은 다음 재제출에서 다시 채워야 하므로 스테이징 상태 그대로
    -- 둔다(지점 자체가 비공개 상태이므로 노출 위험 없음) - 다만 registration_status는
    -- 반드시 'rejected'로 바꿔야 대기열에서 빠지고, 파트너 화면에 반려 안내가 뜬다.
    update public.ga_branch
    set registration_status = 'rejected'
    where id = v_reg.branch_id;

  elsif p_decision = 'approved' and v_reg.request_type = 'update' then
    v_payload := v_reg.payload;
    update public.ga_branch set
      name = coalesce(v_payload->>'name', name),
      region_id = case when v_payload ? 'regionId' then (v_payload->>'regionId')::uuid else region_id end,
      address = coalesce(v_payload->>'address', address),
      address_detail = coalesce(v_payload->>'addressDetail', address_detail),
      intro_text = coalesce(v_payload->>'introText', intro_text),
      education_info = coalesce(v_payload->>'educationInfo', education_info),
      welfare_info = coalesce(v_payload->>'welfareInfo', welfare_info),
      db_support_info = coalesce(v_payload->>'dbSupportInfo', db_support_info),
      settlement_support_info = coalesce(v_payload->>'settlementSupportInfo', settlement_support_info),
      planner_count = case when v_payload ? 'plannerCount' then (v_payload->>'plannerCount')::int else planner_count end,
      parking_available = case when v_payload ? 'parkingAvailable' then (v_payload->>'parkingAvailable')::boolean else parking_available end,
      visit_consult_available = case when v_payload ? 'visitConsultAvailable' then (v_payload->>'visitConsultAvailable')::boolean else visit_consult_available end,
      business_hours = coalesce(v_payload->>'businessHours', business_hours),
      tagline = coalesce(v_payload->>'tagline', tagline),
      new_recruit_training = case when v_payload ? 'newRecruitTraining' then (v_payload->>'newRecruitTraining')::boolean else new_recruit_training end,
      experienced_hire = case when v_payload ? 'experiencedHire' then (v_payload->>'experiencedHire')::boolean else experienced_hire end,
      db_support = case when v_payload ? 'dbSupport' then (v_payload->>'dbSupport')::boolean else db_support end,
      settlement_support = case when v_payload ? 'settlementSupport' then (v_payload->>'settlementSupport')::boolean else settlement_support end
    where id = v_reg.branch_id;

    update public.branch_media set pending_registration_id = null
    where pending_registration_id = p_registration_id;
  end if;
  -- 반려된 'update' 요청은 원래부터 ga_branch를 전혀 건드리지 않는다(수정 전 상태 그대로
  -- 유지) - registration_status도 이미 'approved'였던 값 그대로가 맞으므로 손대지 않는다.

  update public.branch_registrations
  set status = p_decision, reviewed_by_admin_id = public.current_admin_id(), reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_registration_id;
end;
$$;

grant execute on function public.review_branch_registration(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 기존 유령 데이터 정합화 - 이미 반려됐지만(branch_registrations.status='rejected')
-- ga_branch.registration_status가 여태 'pending'으로 남아있는 신규등록 건을 전부
-- 소급 수정한다(메타리치 1본부·굿굿 포함, 이름을 하드코딩하지 않고 조건으로 찾는다).
-- ---------------------------------------------------------
update public.ga_branch b
set registration_status = 'rejected'
where b.registration_status = 'pending'
  and exists (
    select 1 from public.branch_registrations r
    where r.branch_id = b.id and r.request_type = 'create' and r.status = 'rejected'
  );

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select b.name, b.registration_status, r.status, r.reviewed_at
--   from public.ga_branch b join public.branch_registrations r on r.branch_id = b.id
--   where r.request_type = 'create' and r.status = 'rejected';
-- (전부 registration_status='rejected'여야 정상)
