-- =========================================================
-- 0091_top_designer_revisions.sql
-- E: TOP설계사 수정 화면(오너 지시 2026-08-10, CTO 재확인) - "수정이 없었던" 이유는
-- submit_top_designer_certification이 status='approved'면 재제출을 통째로 막았기
-- 때문이다(0082). 승인 후에도 수정이 되게 하되, 필드 성격에 따라 두 갈래로 나눈다:
--
--   즉시 반영  - 자기소개/프로필 사진 (심사 불필요, status 그대로)
--   재심사     - 직급/소속 GA/본부·지점명/신고 연봉 (재승인 전까지 공개 화면은
--                기존 값 그대로 - "공개용 승인 상태"와 "심사 진행 상태"를 분리해야
--                한다는 게 이 마이그레이션의 핵심).
--
-- "분리"를 별도 컬럼(예: review_status)으로 top_designer_certifications 위에 얹지
-- 않고 별도 테이블(top_designer_certification_revisions)로 뺀 이유: 재심사 대상
-- 필드값 자체(제안된 새 직급/GA/연봉)를 승인 전까지 어딘가에 보관해야 하는데,
-- 원본 행에 얹으면 "지금 공개 중인 값"과 "심사 중인 제안값"이 같은 컬럼을 다퉈
-- 매 쿼리마다 분기해야 한다. 별도 행이면 공개 뷰/카드/랭킹은 지금처럼
-- top_designer_certifications만 보면 되고(재심사 중에도 기존 값 그대로 노출 = A안,
-- 코드 변경 없이 자동으로 만족), 관리자 화면만 LEFT JOIN으로 "재심사 중" 배지를
-- 추가로 얹으면 된다.
--
-- 반려 시 "기존 등급 유지"도 이 구조에서 자동으로 성립한다 - 반려는 revisions 행의
-- status만 'rejected'로 바꾸고 원본 top_designer_certifications 행은 애초에 건드리지
-- 않았으므로 되돌릴 것 자체가 없다.
--
-- 서류 재제출 필수(콘텐츠팀 정책 - 원천징수영수증/명함은 심사 완료 후 파기되므로
-- 원본 서류가 이미 없다) - income_doc_storage_path/business_card_path를 not null로 둔다.
-- =========================================================

create table public.top_designer_certification_revisions (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.top_designer_certifications(id) on delete cascade,
  user_id uuid not null references public.users(id),
  job_title text not null,
  ga_company_id uuid not null references public.ga_company(id),
  branch_name text,
  declared_annual_income_krw bigint,
  income_doc_storage_path text not null,
  business_card_path text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'on_hold', 'approved', 'rejected')),
  review_reason text,
  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_designer_certification_revisions_certification_id_key unique (certification_id)
);

alter table public.top_designer_certification_revisions enable row level security;

create policy "member reads own top designer revision" on public.top_designer_certification_revisions
  for select using (user_id = current_member_id());

-- ---------------------------------------------------------
-- 1. 즉시 반영 - 자기소개/경력/사진. 심사 불필요, status 그대로.
--    사진 업로드 없이 공개여부만 바꾸는 것도 허용하려면 p_photo_path가 null일 때
--    photo_public도 기존 값을 유지해야 한다(coalesce) - 새 사진을 등록할 때만
--    public.top_designer_certifications가 p_photo_public을 필수로 요구한다(0080/0082와
--    동일한 안전기본값 패턴).
-- ---------------------------------------------------------
create or replace function public.update_top_designer_profile(
  p_self_introduction text default null,
  p_career_years int default null,
  p_photo_path text default null,
  p_photo_public boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_member_id();
begin
  if p_photo_path is not null and p_photo_public is null then
    raise exception 'PHOTO_PUBLIC_CHOICE_REQUIRED';
  end if;

  update public.top_designer_certifications set
    self_introduction = p_self_introduction,
    career_years = p_career_years,
    photo_path = coalesce(p_photo_path, photo_path),
    photo_public = case when p_photo_path is not null then p_photo_public else photo_public end,
    updated_at = now()
  where user_id = v_user_id and status = 'approved';

  if not found then
    raise exception 'NOT_APPROVED_CERTIFICATION';
  end if;
end;
$$;

grant execute on function public.update_top_designer_profile(text, int, text, boolean) to authenticated;

-- ---------------------------------------------------------
-- 2. 재심사 신청 - 직급/GA/지점/신고연봉 변경 제안. 원본 행은 건드리지 않는다.
--    이미 재심사 중(pending_review/on_hold)이면 덮어쓰지 않고 예외를 던진다 -
--    화면에서 재제출 버튼을 그동안 비활성화하는 게 1차 방어선이지만, RPC 레벨에서도
--    막아야 동시 탭/새로고침 경합에서 안전하다.
-- ---------------------------------------------------------
create or replace function public.submit_top_designer_certification_revision(
  p_job_title text,
  p_ga_company_id uuid,
  p_income_doc_path text,
  p_business_card_path text,
  p_branch_name text default null,
  p_declared_annual_income_krw bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_member_id();
  v_cert_id uuid;
  v_id uuid;
begin
  select id into v_cert_id from public.top_designer_certifications
    where user_id = v_user_id and status = 'approved';
  if v_cert_id is null then
    raise exception 'NOT_APPROVED_CERTIFICATION';
  end if;

  if length(trim(coalesce(p_job_title, ''))) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if not exists (select 1 from public.ga_company where id = p_ga_company_id) then
    raise exception 'INVALID_GA_COMPANY';
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

  insert into public.top_designer_certification_revisions (
    certification_id, user_id, job_title, ga_company_id, branch_name,
    declared_annual_income_krw, income_doc_storage_path, business_card_path, status
  ) values (
    v_cert_id, v_user_id, trim(p_job_title), p_ga_company_id, nullif(trim(coalesce(p_branch_name, '')), ''),
    p_declared_annual_income_krw, p_income_doc_path, p_business_card_path, 'pending_review'
  )
  on conflict (certification_id) do update set
    job_title = excluded.job_title,
    ga_company_id = excluded.ga_company_id,
    branch_name = excluded.branch_name,
    declared_annual_income_krw = excluded.declared_annual_income_krw,
    income_doc_storage_path = excluded.income_doc_storage_path,
    business_card_path = excluded.business_card_path,
    status = 'pending_review',
    review_reason = null,
    reviewed_by_admin_id = null,
    reviewed_at = null,
    updated_at = now()
  where public.top_designer_certification_revisions.status not in ('pending_review', 'on_hold')
  returning id into v_id;

  if v_id is null then
    raise exception 'REVISION_ALREADY_PENDING';
  end if;

  return v_id;
end;
$$;

grant execute on function public.submit_top_designer_certification_revision(text, uuid, text, text, text, bigint) to authenticated;

-- ---------------------------------------------------------
-- 3. 관리자 재심사 처리 - 승인 시에만 원본 top_designer_certifications에 반영한다.
--    반려/보류는 원본을 건드리지 않으므로 "반려 시 기존 등급 유지"가 저절로 성립한다.
--    승인/반려로 "완료"되면 서류를 파기한다(경로만 null - 실제 파일 삭제는 기존
--    admin_review_top_designer_certification과 동일하게 TS 서버 액션이 Storage API로
--    수행, storage.protect_delete 트리거 때문에 SQL DELETE 불가는 0082와 동일).
-- ---------------------------------------------------------
create or replace function public.admin_review_top_designer_certification_revision(
  p_revision_id uuid,
  p_decision text,
  p_star_tier text default null,
  p_confirmed_income_krw bigint default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_revision record;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'on_hold', 'rejected', 'pending_review') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_revision from public.top_designer_certification_revisions where id = p_revision_id;
  if v_revision is null then
    raise exception 'REVISION_NOT_FOUND';
  end if;

  if p_decision = 'approved' then
    if p_star_tier not in ('star_1', 'star_2', 'star_3', 'star_4') then
      raise exception 'INVALID_STAR_TIER';
    end if;
    if p_confirmed_income_krw is null or p_confirmed_income_krw <= 0 then
      raise exception 'INVALID_CONFIRMED_INCOME';
    end if;

    update public.top_designer_certifications set
      job_title = v_revision.job_title,
      ga_company_id = v_revision.ga_company_id,
      branch_name = v_revision.branch_name,
      declared_annual_income_krw = v_revision.declared_annual_income_krw,
      star_tier = p_star_tier,
      confirmed_annual_income_krw = p_confirmed_income_krw,
      updated_at = now()
    where id = v_revision.certification_id;

    update public.top_designer_certification_revisions set
      status = 'approved',
      review_reason = null,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      income_doc_storage_path = null,
      business_card_path = null,
      updated_at = now()
    where id = p_revision_id;
  elsif p_decision in ('on_hold', 'rejected') then
    if length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    update public.top_designer_certification_revisions set
      status = p_decision,
      review_reason = trim(p_reason),
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      income_doc_storage_path = case when p_decision = 'rejected' then null else income_doc_storage_path end,
      business_card_path = case when p_decision = 'rejected' then null else business_card_path end,
      updated_at = now()
    where id = p_revision_id;
  else
    update public.top_designer_certification_revisions set
      status = 'pending_review',
      review_reason = null,
      reviewed_by_admin_id = null,
      reviewed_at = null,
      updated_at = now()
    where id = p_revision_id;
  end if;
end;
$$;

grant execute on function public.admin_review_top_designer_certification_revision(uuid, text, text, bigint, text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name from information_schema.columns where table_name='top_designer_certification_revisions' order by ordinal_position;
-- select * from public.top_designer_certification_revisions;
