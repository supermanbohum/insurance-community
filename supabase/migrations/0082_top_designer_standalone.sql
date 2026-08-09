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
-- consent_public_display는 새 하드 게이트다(CTO 지시) - 오너가 "TOP 설계사는 개인
-- 특정 OK"로 확정하면서 처음으로 실명·GA·소속 공개에 대한 명시적 동의가 필요해졌다.
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
  add column photo_path text,
  add column photo_public boolean,
  add column consent_public_display boolean not null default false,
  add constraint top_designer_certifications_user_id_key unique (user_id);

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
  p_consent_public_display boolean,
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
  if p_declared_annual_income_krw is not null and p_declared_annual_income_krw <= 0 then
    raise exception 'INVALID_INCOME';
  end if;
  if not p_consent_public_display then
    raise exception 'CONSENT_REQUIRED';
  end if;
  if p_photo_path is not null and p_photo_public is null then
    raise exception 'PHOTO_PUBLIC_CHOICE_REQUIRED';
  end if;

  insert into public.top_designer_certifications (
    user_id, name, ga_company_id, branch_name, job_title, career_years, self_introduction,
    income_doc_storage_path, declared_annual_income_krw, photo_path, photo_public,
    consent_public_display
  ) values (
    v_user_id, trim(p_name), p_ga_company_id, nullif(trim(coalesce(p_branch_name, '')), ''), trim(p_job_title),
    p_career_years, p_self_introduction, p_income_doc_path, p_declared_annual_income_krw, p_photo_path, p_photo_public,
    p_consent_public_display
  )
  on conflict (user_id) do update set
    name = excluded.name,
    ga_company_id = excluded.ga_company_id,
    branch_name = excluded.branch_name,
    job_title = excluded.job_title,
    career_years = excluded.career_years,
    self_introduction = excluded.self_introduction,
    income_doc_storage_path = excluded.income_doc_storage_path,
    declared_annual_income_krw = excluded.declared_annual_income_krw,
    photo_path = excluded.photo_path,
    photo_public = excluded.photo_public,
    consent_public_display = excluded.consent_public_display,
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
  text, uuid, text, text, boolean, text, int, text, bigint, text, boolean
) to authenticated;

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
