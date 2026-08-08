-- =========================================================
-- 0074_branch_registration_intro_length_check.sql (지점폼 서버검증 전수확인)
-- 오너 지시("지점 등록 사진은 완화하지 않는다")를 계기로 지점 등록 폼 전체를
-- 필드별로 서버 검증 유무를 전수 확인했다:
--   GA명/지점명/주소/슬러그        submit_branch_registration()에서 이미 검증(INVALID_INPUT)
--   등록자 정보 5종                 submit_branch_registration()에서 이미 검증(MISSING_REGISTRANT_INFO)
--   임대차계약서/명함               review_branch_registration()에서 이미 검증(MISSING_REQUIRED_DOCUMENTS)
--   대표사진 1장/사무실사진 3장     review_branch_registration()에서 이미 검증
--                                   (MISSING_MAIN_PHOTO/MISSING_OFFICE_PHOTOS, < 3)
--                                   → 즉 "사진 요건 서버 검증"(W-080)은 이미 승인 게이트에
--                                   존재했다. 이전 세션에서 submit 단계만 확인하고 review
--                                   단계를 놓쳐 "서버 검증 없음"이라 잘못 보고했었다 - 실제로는
--                                   사진 없는 지점은 절대 승인(공개)될 수 없다.
--   지점 소개글 최소 50자           ← 유일하게 실제로 빠져 있던 항목. 클라이언트
--                                   (OnboardingForm.tsx MIN_INTRO_LENGTH=50)에서만 강제되고
--                                   있었다. review_branch_registration()에 승인 시점 체크를
--                                   추가한다(사진/서류와 동일한 지점 - 승인 게이트).
-- 0022 적용 후 실행.
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

  update public.branch_registrations
  set status = p_decision, reviewed_by_admin_id = public.current_admin_id(), reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_registration_id;

  if p_decision = 'rejected' then
    -- 반려된 신규 등록 사진은 다음 재제출에서 다시 채워야 하므로 스테이징 상태 그대로 둔다
    -- (지점 자체가 비공개 상태이므로 노출 위험 없음).
    null;
  end if;
end;
$$;

grant execute on function public.review_branch_registration(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select prosrc ilike '%INTRO_TEXT_TOO_SHORT%' from pg_proc where proname = 'review_branch_registration';
