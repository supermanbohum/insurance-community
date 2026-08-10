-- =========================================================
-- 0092_top_designer_branch_id_autofill.sql
-- ⑨ 우리 동네 순위 착수 전 선행 작업(오너 지시 "우리동네 제작해 만들어만둬", CTO 지시) -
-- 0087에서 top_designer_certifications.branch_id 컬럼을 추가하며 "다음 단계 폼에서
-- 배선한다"고 남겼는데, submit_top_designer_certification이 그 이후로도 branch_id를
-- 전혀 채우지 않고 있었다(직접 확인 - RPC 파라미터·TS 액션 어디에도 없음). 배선 없이
-- 지역별 랭킹을 만들면 고배점(TOP 인증, 3~20점) 쪽이 영원히 지역 미귀속 상태로
-- 남아 "만들어둔 기능"이 아니라 "처음부터 반쪽인 기능"이 된다(CTO 판단).
--
-- 사용자에게 다시 묻지 않는다 - 오너 사양상 ⓒ(TOP) 신청자는 항상 ⓑ(우리 지점 설계사
-- 등록, branch_planner_registrations)를 먼저 완료한 사람이라 존재가 보장된다. 그래서
-- 폼 입력을 늘리는 대신 RPC가 서버에서 v_user_id로 자기 자신의 승인된 ⓑ 행을 찾아
-- branch_id를 자동으로 채운다(이중입력 방지).
--
-- ⓑ 등록이 없는 사람이 신청하면? - 오너 사양상 나올 수 없는 경우이지만, 방어적으로
-- 하드 실패시키지 않는다(CTO 지시) - branch_id가 null인 채로 신청 자체는 계속
-- 진행된다(이 필드는 랭킹 지역 귀속에만 쓰이지 인증 심사 자체의 필수 조건이 아니다).
-- =========================================================

drop function if exists public.submit_top_designer_certification(
  text, uuid, text, text, text, boolean, boolean, text, int, text, bigint, text, boolean
);

create or replace function public.submit_top_designer_certification(
  p_name text,
  p_ga_company_id uuid,
  p_job_title text,
  p_income_doc_path text,
  p_business_card_path text,
  p_consent_public_display boolean,
  p_consent_document_collection boolean,
  p_branch_name text default null,
  p_career_years int default null,
  p_self_introduction text default null,
  p_declared_annual_income_krw bigint default null,
  p_photo_path text default null,
  p_photo_public boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_id uuid;
  v_branch_id uuid;
begin
  if not public.is_full_member() then
    raise exception 'NOT_FULL_MEMBER';
  end if;
  v_user_id := public.current_member_id();

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if not exists (select 1 from public.ga_company where id = p_ga_company_id) then
    raise exception 'INVALID_GA_COMPANY';
  end if;
  if length(trim(coalesce(p_job_title, ''))) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if length(trim(coalesce(p_income_doc_path, ''))) = 0 then
    raise exception 'MISSING_INCOME_DOCUMENT';
  end if;
  if length(trim(coalesce(p_business_card_path, ''))) = 0 then
    raise exception 'MISSING_BUSINESS_CARD';
  end if;
  if p_declared_annual_income_krw is not null and p_declared_annual_income_krw <= 0 then
    raise exception 'INVALID_INCOME';
  end if;
  if not p_consent_public_display then
    raise exception 'CONSENT_PUBLIC_DISPLAY_REQUIRED';
  end if;
  if not p_consent_document_collection then
    raise exception 'CONSENT_DOCUMENT_COLLECTION_REQUIRED';
  end if;
  if p_photo_path is not null and p_photo_public is null then
    raise exception 'PHOTO_PUBLIC_CHOICE_REQUIRED';
  end if;

  -- ⑨(우리 동네 순위) 선행 작업 - ⓑ를 완료한 사람의 승인된 지점을 자동으로 물려받는다.
  -- 없어도(오너 사양상 불가능하지만) 하드 실패시키지 않고 null로 둔다(CTO 지시).
  select branch_id into v_branch_id
  from public.branch_planner_registrations
  where user_id = v_user_id and status = 'approved';

  insert into public.top_designer_certifications (
    user_id, name, ga_company_id, branch_name, branch_id, job_title, career_years, self_introduction,
    income_doc_storage_path, business_card_path, declared_annual_income_krw, photo_path, photo_public,
    consent_public_display, consent_document_collection
  ) values (
    v_user_id, trim(p_name), p_ga_company_id, nullif(trim(coalesce(p_branch_name, '')), ''), v_branch_id, trim(p_job_title),
    p_career_years, p_self_introduction, p_income_doc_path, p_business_card_path, p_declared_annual_income_krw,
    p_photo_path, p_photo_public, p_consent_public_display, p_consent_document_collection
  )
  on conflict (user_id) do update set
    name = excluded.name,
    ga_company_id = excluded.ga_company_id,
    branch_name = excluded.branch_name,
    branch_id = excluded.branch_id,
    job_title = excluded.job_title,
    career_years = excluded.career_years,
    self_introduction = excluded.self_introduction,
    income_doc_storage_path = excluded.income_doc_storage_path,
    business_card_path = excluded.business_card_path,
    declared_annual_income_krw = excluded.declared_annual_income_krw,
    photo_path = excluded.photo_path,
    photo_public = excluded.photo_public,
    consent_public_display = excluded.consent_public_display,
    consent_document_collection = excluded.consent_document_collection,
    status = 'pending_review',
    review_reason = null,
    reviewed_by_admin_id = null,
    reviewed_at = null,
    ocr_status = 'not_run',
    ocr_extracted_income_krw = null,
    ocr_raw_response = null,
    ocr_confidence = null,
    updated_at = now()
  where public.top_designer_certifications.status <> 'approved'
  returning id into v_id;

  if v_id is null then
    raise exception 'ALREADY_APPROVED';
  end if;

  return v_id;
end;
$$;

grant execute on function public.submit_top_designer_certification(
  text, uuid, text, text, text, boolean, boolean, text, int, text, bigint, text, boolean
) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select id, user_id, branch_id from public.top_designer_certifications;
