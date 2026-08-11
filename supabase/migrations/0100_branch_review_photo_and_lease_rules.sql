-- =========================================================
-- 0100_branch_review_photo_and_lease_rules.sql
-- 지점 등록 폼 개편 ② - 승인 검증 조건 변경(오너 지시).
--
--   임대차계약서   필수 검증에서 제거 (폼에서 더 이상 받지 않는다)
--   사무실 사진    최소 3장 → 최소 5장
--   대표 홍보사진  존재 검사 유지 = 하한 1장
--
-- 🔴 lease_contract_path 컬럼은 남긴다(CTO 지시). 이미 제출된 등록 건의 계약서 경로가
-- 거기 있고, 컬럼을 지우면 진행 중인 건의 기록까지 사라진다. 검증에서만 뺀다.
--
-- 🔴 배포 순서: 이 마이그레이션이 폼보다 먼저다. 이것만 적용된 상태는 "계약서를 받지만
-- 안 받아도 승인됨"이라 안전하고, 반대로 폼이 먼저 나가면 "계약서를 안 받는데 승인은
-- 계약서를 요구"해서 신규 등록이 100% 승인 불가가 된다. 한쪽 방향만 안전하다.
--
-- 🔴 상한은 존재하지 않는다(오너 지시 2026-08-11, 대표·사무실 모두 상한 폐지).
-- 승인은 하한만 본다. 승인 단계에서 상한을 걸면 이미 초과 업로드된 건을 관리자가
-- 줄일 방법이 없어 영구 승인 불가가 되기 때문이며, 이 근거는 앞으로 상한이
-- 부활하더라도 유효하다.
--
-- 함수 본문은 파일이 아니라 운영 DB의 현재 정의(pg_get_functiondef)를 그대로 옮기고
-- 위 세 곳만 고쳤다 - 0099에서 파일 주석과 실제 함수가 달랐던 전례가 있어서다.
-- =========================================================

create or replace function public.review_branch_registration(
  p_registration_id uuid,
  p_decision text,
  p_reason text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    -- 임대차계약서는 더 이상 요구하지 않는다. 명함만 필수다.
    if v_reg.business_card_path is null then
      raise exception 'MISSING_REQUIRED_DOCUMENTS';
    end if;
    if not exists (select 1 from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_main') then
      raise exception 'MISSING_MAIN_PHOTO';
    end if;
    if (select count(*) from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_office') < 5 then
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

  update public.branch_registrations
  set status = p_decision, reviewed_by_admin_id = public.current_admin_id(), reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_registration_id;
end;
$function$;

-- ---------------------------------------------------------
-- 확인 쿼리 - 적용 후 검증 조건이 바뀌었는지 원문으로 확인한다.
-- ---------------------------------------------------------
-- select pg_get_functiondef(oid) from pg_proc where proname = 'review_branch_registration';
--   기대: lease_contract_path 검사 없음 / image_office < 5
