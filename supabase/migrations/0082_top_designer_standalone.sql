-- =========================================================
-- 0082_top_designer_standalone.sql (Phase 0)
-- 오너 지시(2026-08-09): "top설계사와 설계사등록은 별개로 가는 걸로" - 마켓(이직·익명)과
-- TOP(과시·공개)의 공개 원칙이 정반대라 같은 데이터를 공유하면 계속 충돌한다(B안, CTO
-- 리스크 검토 후 확정). DB에서 "이 TOP 설계사가 저 마켓 프로필과 같은 사람"을 알 수
-- 없어야 한다 - planner_profile_id를 완전히 제거하고 user_id로 직접 소유권을 갖는다.
--
-- top_designer_certifications는 현재 승인/대기/반려 전부 포함해 0건이라(직접 확인)
-- 데이터 백필이 필요 없다 - 컬럼을 안전하게 드롭/재정의할 수 있다.
--
-- 스키마는 하이브리드다(CTO 실측: ga_company 승인 50개 / ga_branch 0개 - 오늘 오너
-- 지시로 전부 초기화됨). GA는 기존 디렉토리에 연결하고(ga_company_id, GaSearchSelect
-- 재사용), 본부/지점은 선택할 게 없는 선택 UI가 되지 않도록 자유 텍스트로 받는다
-- (branch_name). ga_branch_id 같은 매칭용 FK는 지금 만들지 않는다 - 지점이 쌓이면 그때
-- 추가한다("언젠가 채우겠지" 컬럼을 미리 만들지 않는다).
--
-- career_years/self_introduction은 기존 상세페이지의 표현력을 유지하기 위해 자체
-- 필드로 새로 받는다(이전엔 planner_profiles JOIN으로 가져오던 것).
--
-- consent_public_display·consent_document_collection은 콘텐츠팀 확정 문안 기준
-- 하드 게이트다(CTO 지시) - 공개 동의(실명·GA·소속·별등급)와 서류수집 동의(원천징수
-- 영수증·명함·신고연봉)는 성격이 달라 체크박스를 분리한다.
--
-- business_card_path는 오너 추가 지시(2026-08-09) - 소득은 원천징수영수증으로,
-- 소속·직급은 명함으로 증명한다. 랭킹에 뜨는 GA·본부가 자유 텍스트라 검증 수단이
-- 없었는데 명함이 그 공백을 메운다.
--
-- 🔴 원천징수영수증·명함은 심사 완료(승인/반려) 후 지체 없이 파기한다(콘텐츠팀 확정
-- 정책) - admin_review_top_designer_certification이 결정 확정 시 스토리지 파일을
-- 직접 삭제하고 경로 컬럼을 null로 비운다. 심사 기록(신청자·일시·등급·처리자·결과)은
-- 파기와 별개로 행 자체에 남는다(user_id/reviewed_at/star_tier/reviewed_by_admin_id/
-- status가 이미 그 5개 필드다 - 별도 로그 테이블 불필요, 분쟁 대비는 서류 원본이 아니라
-- 이 기록으로 한다는 게 콘텐츠·CTO 확정 원칙). 그래서 income_doc_storage_path를
-- not null에서 nullable로 완화한다(파기 후엔 null이 되어야 하므로).
-- =========================================================

-- ---------------------------------------------------------
-- 1. 테이블 재정의 - planner_profile_id 제거, 자체 필드로 전환
--    이 컬럼에 의존하는 공개 뷰와 테이블 자체 RLS 정책을 먼저 드롭해야 컬럼을
--    드롭할 수 있다(cannot drop column ... depends on it).
-- ---------------------------------------------------------
drop view if exists public.public_top_designer_certifications;
drop policy if exists "member reads own top designer certification" on public.top_designer_certifications;

alter table public.top_designer_certifications
  drop constraint top_designer_certifications_planner_profile_id_fkey,
  drop constraint top_designer_certifications_planner_profile_id_key,
  drop column planner_profile_id;

alter table public.top_designer_certifications
  add column user_id uuid not null references public.users(id),
  add column name text not null,
  add column ga_company_id uuid not null references public.ga_company(id),
  add column branch_name text,
  add column career_years int,
  add column self_introduction text,
  add column business_card_path text,
  add column photo_path text,
  add column photo_public boolean,
  add column consent_public_display boolean not null default false,
  add column consent_document_collection boolean not null default false,
  add constraint top_designer_certifications_user_id_key unique (user_id);

-- 심사 완료 후 원천징수영수증을 파기하면 이 컬럼이 null이 되어야 하므로 완화한다.
alter table public.top_designer_certifications
  alter column income_doc_storage_path drop not null;

create policy "member reads own top designer certification" on public.top_designer_certifications
  for select using (user_id = current_member_id());

-- ---------------------------------------------------------
-- 2. 신청 RPC 재작성 - 소유권을 user_id로, 신규 필드 전부 반영, 동의 필수화,
--    사진 있는데 공개선택 안 하면 거부(0080과 동일한 안전기본값 패턴).
--    기존과 동일하게 승인 전(pending_review/on_hold/rejected)이면 재신청=수정으로
--    처리한다(on conflict do update).
-- ---------------------------------------------------------
drop function if exists public.submit_top_designer_certification(uuid, text, text, bigint);

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
  if public.is_blocked_designer_job_title(p_job_title) then
    raise exception 'BLOCKED_JOB_TITLE';
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

-- ---------------------------------------------------------
-- 2.5. 심사 완료 시 서류 파기 - 콘텐츠팀 확정 정책("심사 완료 후 지체 없이 파기").
--    🔴 스토리지 파일 자체는 여기서 못 지운다 - 이 프로젝트의 storage.objects에는
--    직접 DELETE를 막는 트리거(storage.protect_delete)가 걸려 있어 "Direct deletion
--    from storage tables is not allowed. Use the Storage API instead."로 실패한다
--    (SQL 시뮬레이션으로 실제 확인함). 그래서 이 RPC는 경로 컬럼만 null로 비우고,
--    실제 파일 삭제는 호출하는 TS 서버 액션이 admin 클라이언트의 Storage API
--    (.storage.from(...).remove(...))로 수행한다(reviewTopDesignerCertificationAction
--    - RPC 호출 전에 경로를 읽어두고, RPC 성공 후 그 경로로 remove한다).
--    심사 기록(user_id/reviewed_at/star_tier/reviewed_by_admin_id/status)은 행에
--    그대로 남는다 - 분쟁 대비는 서류 원본이 아니라 이 기록으로 한다(콘텐츠·CTO 확정).
-- ---------------------------------------------------------
create or replace function public.admin_review_top_designer_certification(p_certification_id uuid, p_decision text, p_star_tier text default null, p_confirmed_income_krw bigint default null, p_reason text default null)
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
  if p_decision not in ('approved', 'on_hold', 'rejected', 'pending_review') then
    raise exception 'INVALID_DECISION';
  end if;
  if not exists (select 1 from public.top_designer_certifications where id = p_certification_id) then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;

  if p_decision = 'approved' then
    if p_star_tier not in ('star_1', 'star_2', 'star_3', 'star_4', 'star_5') then
      raise exception 'INVALID_STAR_TIER';
    end if;
    if p_confirmed_income_krw is null or p_confirmed_income_krw <= 0 then
      raise exception 'INVALID_CONFIRMED_INCOME';
    end if;
    update public.top_designer_certifications set
      status = 'approved',
      star_tier = p_star_tier,
      confirmed_annual_income_krw = p_confirmed_income_krw,
      review_reason = null,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      income_doc_storage_path = null,
      business_card_path = null,
      updated_at = now()
    where id = p_certification_id;
  elsif p_decision in ('on_hold', 'rejected') then
    if length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    update public.top_designer_certifications set
      status = p_decision,
      review_reason = trim(p_reason),
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      income_doc_storage_path = case when p_decision = 'rejected' then null else income_doc_storage_path end,
      business_card_path = case when p_decision = 'rejected' then null else business_card_path end,
      updated_at = now()
    where id = p_certification_id;
  else
    update public.top_designer_certifications set
      status = 'pending_review',
      review_reason = null,
      reviewed_by_admin_id = null,
      reviewed_at = null,
      updated_at = now()
    where id = p_certification_id;
  end if;
end;
$$;

-- ---------------------------------------------------------
-- 3. 소유자 확인 헬퍼 - is_owner_of_planner_profile을 대체한다(스토리지 정책용).
-- ---------------------------------------------------------
create or replace function public.is_owner_of_top_designer_certification(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = public.current_member_id();
$$;

-- ---------------------------------------------------------
-- 4. 스토리지 정책 재작성 - 폴더 접두사가 이제 planner_profile_id가 아니라 user_id다.
-- ---------------------------------------------------------
drop policy if exists "top designer docs: insert by owner or admin" on storage.objects;
drop policy if exists "top designer docs: select by owner or admin" on storage.objects;
drop policy if exists "top designer docs: delete by owner or admin" on storage.objects;

create policy "top designer docs: insert by owner or admin" on storage.objects
  for insert with check (
    bucket_id = 'top-designer-income-docs'
    and (current_admin_id() is not null or public.is_owner_of_top_designer_certification(((storage.foldername(name))[1])::uuid))
  );
create policy "top designer docs: select by owner or admin" on storage.objects
  for select using (
    bucket_id = 'top-designer-income-docs'
    and (current_admin_id() is not null or public.is_owner_of_top_designer_certification(((storage.foldername(name))[1])::uuid))
  );
create policy "top designer docs: delete by owner or admin" on storage.objects
  for delete using (
    bucket_id = 'top-designer-income-docs'
    and (current_admin_id() is not null or public.is_owner_of_top_designer_certification(((storage.foldername(name))[1])::uuid))
  );

-- 신규 사진 버킷 - planner-market-profile-photos와 동일 패턴(비공개 플래그, 소유자만
-- insert/delete, 공개 조회는 object/public 경로로 - 기존 사진 버킷들과 동일하게 동작
-- 확인함).
insert into storage.buckets (id, name, public)
values ('top-designer-profile-photos', 'top-designer-profile-photos', false)
on conflict (id) do nothing;

drop policy if exists "top designer photo: insert by owner" on storage.objects;
drop policy if exists "top designer photo: delete by owner" on storage.objects;

create policy "top designer photo: insert by owner" on storage.objects
  for insert with check (
    bucket_id = 'top-designer-profile-photos'
    and ((storage.foldername(name))[1])::uuid = current_member_id()
  );
create policy "top designer photo: delete by owner" on storage.objects
  for delete using (
    bucket_id = 'top-designer-profile-photos'
    and ((storage.foldername(name))[1])::uuid = current_member_id()
  );

-- ---------------------------------------------------------
-- 5. 공개 뷰 재작성 - planner_profiles JOIN 완전 제거. 실명·GA·본부는 항상 노출
--    (오너 확정 - "개인 특정 OK"), 사진만 photo_public 게이팅(0080과 동일 패턴).
-- ---------------------------------------------------------
-- (뷰는 1단계에서 이미 드롭했다 - 컬럼 집합이 완전히 바뀌므로 create or replace로는
-- 안 된다("cannot drop columns from view").)
create view public.public_top_designer_certifications
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.ga_company_id,
  g.name as ga_company_name,
  c.branch_name,
  c.job_title,
  c.star_tier,
  c.career_years,
  c.self_introduction,
  c.reviewed_at as certified_at,
  c.created_at,
  case when c.photo_public then c.photo_path else null end as photo_path,
  (select count(*) from public.top_designer_views v where v.top_designer_certification_id = c.id) as view_count,
  (select count(*) from public.top_designer_likes l where l.top_designer_certification_id = c.id) as like_count
from public.top_designer_certifications c
join public.ga_company g on g.id = c.ga_company_id
where c.status = 'approved';

grant select on public.public_top_designer_certifications to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name from information_schema.columns where table_name='top_designer_certifications' order by ordinal_position;
-- select * from public.public_top_designer_certifications;
