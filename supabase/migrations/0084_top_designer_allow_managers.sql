-- ---------------------------------------------------------
-- TOP 설계사 - 관리직 신청 허용 (오너 지시, 2026-08-10 대규모 개편 ⑩)
--
-- 기존엔 TOP 설계사·연봉랭킹 둘 다 is_blocked_designer_job_title()로 관리직
-- (대표/총괄/사업단장/본부장/지점장/임원/이사/대표이사/단장/센터장/관리자)을
-- 차단했다. 오너 지시로 "TOP 설계사에 관리자도 포함"하기로 확정 - 단,
-- 연봉랭킹(salary_ranking_submissions)은 이번 지시 대상이 아니므로 그대로 둔다.
--
-- is_blocked_designer_job_title() 자체를 고치면 submit_salary_ranking(0058)도
-- 함께 풀려버린다 - 공유 함수라 손대지 않는다. 대신 submit_top_designer_certification
-- (0082) 안의 블록리스트 검사 한 줄만 제거해 TOP 설계사 경로에서만 관리직을
-- 허용한다. 시그니처는 0082와 완전히 동일 - 새 함수를 만들지 않고 그대로
-- create or replace한다.
-- ---------------------------------------------------------

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
  -- 0082까지 있던 "if public.is_blocked_designer_job_title(p_job_title) then
  -- raise exception 'BLOCKED_JOB_TITLE'; end if;" 검사를 제거했다(오너 지시 ⑩) -
  -- 관리직도 TOP 설계사 신청 가능.
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

  insert into public.top_designer_certifications (
    user_id, name, ga_company_id, branch_name, job_title, career_years, self_introduction,
    income_doc_storage_path, business_card_path, declared_annual_income_krw, photo_path, photo_public,
    consent_public_display, consent_document_collection
  ) values (
    v_user_id, trim(p_name), p_ga_company_id, nullif(trim(coalesce(p_branch_name, '')), ''), trim(p_job_title),
    p_career_years, p_self_introduction, p_income_doc_path, p_business_card_path, p_declared_annual_income_krw,
    p_photo_path, p_photo_public, p_consent_public_display, p_consent_document_collection
  )
  on conflict (user_id) do update set
    name = excluded.name,
    ga_company_id = excluded.ga_company_id,
    branch_name = excluded.branch_name,
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
