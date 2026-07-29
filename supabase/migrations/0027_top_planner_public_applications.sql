-- =========================================================
-- 0027_top_planner_public_applications.sql
-- TOP설계사(고소득 설계사) 공개 셀프서비스 신청.
--
-- 기존 submit_planner_certification은 "지점등록 승인 완료 + 파트너(GA관리자) 로그인"이
-- 선행조건이었다 - 홈화면 "TOP설계사 등록" 버튼이 이 흐름으로 연결되어 로그인 화면으로
-- 튕기는 버그가 있었다. TOP설계사 등록은 지점등록과 완전히 별개 기능이어야 하므로,
-- 로그인 없이 제출 가능한 별도 진입점을 추가한다.
--
-- 단, "지점 상세페이지 배지/지도 표시/검색/통계"가 안정적으로 동작하려면 신청이 반드시
-- 실제 등록된 ga_branch.id와 FK로 연결되어야 한다 - 지점명을 문자열로만 저장하지 않는다.
-- 그래서 기존 planner_certifications 테이블과 배지 집계(get_branch_planner_badge_summary),
-- 검색/지도 필터(list_branches_with_planner_certifications)를 그대로 재사용하고,
-- "로그인한 파트너가 제출" 전제였던 컬럼(submitted_by_ga_admin_id, job_title)만 nullable로
-- 완화한 뒤 application_source로 출처를 구분한다.
--
-- 0026 적용 후 실행.
-- =========================================================

alter table public.planner_certifications
  alter column submitted_by_ga_admin_id drop not null;

alter table public.planner_certifications
  alter column job_title drop not null;

alter table public.planner_certifications
  add column if not exists application_source text not null default 'partner'
    check (application_source in ('partner', 'public'));

-- ---------------------------------------------------------
-- 공개 신청 RPC - 로그인 세션이 전혀 없는 익명 호출을 전제로 한다. is_ga_admin_for_branch
-- 같은 세션 기반 인가 체크를 쓸 수 없으므로, 대상 지점이 "공개(visible) + 등록승인
-- 완료(approved)" 상태인지 함수 내부에서 직접 재검증한다. 직책(job_title)은 신청 항목에
-- 없으므로 차단 직책 검사는 이 경로에는 적용하지 않는다(파트너 경로는 기존 그대로 유지).
-- ---------------------------------------------------------
create or replace function public.submit_top_planner_application(
  p_branch_id uuid,
  p_planner_name text,
  p_planner_phone text,
  p_planner_company text,
  p_income_tier text,
  p_withholding_doc_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch public.ga_branch;
  v_certification_id uuid;
begin
  select * into v_branch from public.ga_branch where id = p_branch_id;
  if v_branch.id is null or v_branch.status <> 'visible' or v_branch.registration_status <> 'approved' then
    raise exception 'BRANCH_NOT_ELIGIBLE';
  end if;

  if length(trim(p_planner_name)) = 0 or length(trim(p_planner_phone)) = 0
     or length(trim(p_planner_company)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_income_tier not in ('tier_1', 'tier_2', 'tier_3') then
    raise exception 'INVALID_INCOME_TIER';
  end if;
  if length(trim(coalesce(p_withholding_doc_path, ''))) = 0 then
    raise exception 'MISSING_WITHHOLDING_DOCUMENT';
  end if;

  insert into public.planner_certifications (
    branch_id, submitted_by_ga_admin_id, planner_name, planner_phone, planner_company,
    job_title, income_tier, application_source
  ) values (
    p_branch_id, null, trim(p_planner_name), trim(p_planner_phone), trim(p_planner_company),
    null, p_income_tier, 'public'
  ) returning id into v_certification_id;

  insert into public.verification_documents (owner_type, owner_id, doc_type, storage_path)
  values ('planner_certification', v_certification_id, 'withholding_tax_certificate', p_withholding_doc_path);

  return v_certification_id;
end;
$$;

grant execute on function public.submit_top_planner_application(uuid, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------
-- 비공개 서류 버킷에 익명 업로드 허용 - 대상 지점 폴더가 공개+승인 완료 상태일 때만
-- 허용하고(다른 지점 폴더에 끼워넣기 불가), 기존 "관리자/GA관리자" insert 정책과
-- 추가로 OR 결합된다(둘 중 하나만 만족해도 허용 - Postgres RLS의 permissive 정책 결합).
-- ---------------------------------------------------------
create policy "planner docs: public upload for eligible branch"
  on storage.objects for insert
  with check (
    bucket_id = 'planner-verification-docs'
    and exists (
      select 1 from public.ga_branch b
      where b.id = ((storage.foldername(name))[1])::uuid
        and b.status = 'visible' and b.registration_status = 'approved'
    )
  );

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'submit_top_planner_application';
-- select column_name, is_nullable from information_schema.columns
--   where table_name = 'planner_certifications' and column_name in ('submitted_by_ga_admin_id','job_title','application_source');
