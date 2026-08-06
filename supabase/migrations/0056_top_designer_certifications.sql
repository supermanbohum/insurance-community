-- =========================================================
-- 0056_top_designer_certifications.sql
-- TOP 설계사 인증 시스템 - 완전 신규, 독립 시스템(top_designer_ 접두사).
--
-- 기존에 "TOP설계사"라는 이름/개념이 이미 두 곳에 있다:
--   1) planner_certifications(0024/0027) - 월 1,900원 구독, GA 지점관리자가
--      설계사를 대신 등록. 이 마이그레이션은 그 테이블/RPC를 전혀 건드리지 않는다.
--   2) planner_badge_types의 'top_planner'(⭐) 배지 - 플레이스홀더였다(0038/0049
--      주석 참고). 0060에서 별도로 Legacy 처리한다.
-- 이 새 시스템은 위 두 가지와 이름/데이터/RPC 모두 완전히 분리된 제3의 시스템이다.
-- "설계사 등록"(설계사마켓) 흐름에서 신청하므로 planner_profiles(id)만 FK로
-- 재사용한다 - 이는 위 두 레거시 시스템과 무관한, 신원 정보 재사용일 뿐이다.
-- =========================================================

-- ---------------------------------------------------------
-- 관리직 차단 - 0024의 is_blocked_planner_title과는 별개 함수(단장/센터장/관리자 추가).
-- ---------------------------------------------------------
create or replace function public.is_blocked_designer_job_title(p_job_title text)
returns boolean
language sql
immutable
as $$
  select regexp_replace(trim(p_job_title), '\s+', '', 'g')
    ~* '(대표|총괄|사업단장|본부장|지점장|임원|이사|대표이사|단장|센터장|관리자)';
$$;

-- ---------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------
create table public.top_designer_certifications (
  id uuid primary key default gen_random_uuid(),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  job_title text not null,
  income_doc_storage_path text not null,
  declared_annual_income_krw bigint check (declared_annual_income_krw is null or declared_annual_income_krw > 0),
  confirmed_annual_income_krw bigint check (confirmed_annual_income_krw is null or confirmed_annual_income_krw > 0),
  star_tier text check (star_tier in ('star_1', 'star_2', 'star_3', 'star_4', 'star_5')),
  status text not null default 'pending_review' check (status in ('pending_review', 'on_hold', 'approved', 'rejected')),
  review_reason text,
  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,
  ocr_status text not null default 'not_run' check (ocr_status in ('not_run', 'pending', 'completed', 'failed')),
  ocr_extracted_income_krw bigint,
  ocr_raw_response jsonb,
  ocr_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (planner_profile_id),
  check (status <> 'approved' or (star_tier is not null and confirmed_annual_income_krw is not null))
);

create index idx_top_designer_cert_status on public.top_designer_certifications(status);

create trigger trg_top_designer_certifications_updated_at
  before update on public.top_designer_certifications
  for each row execute function public.set_updated_at();

alter table public.top_designer_certifications enable row level security;

create policy "member reads own top designer certification"
  on public.top_designer_certifications for select
  using (public.is_owner_of_planner_profile(planner_profile_id));

-- ---------------------------------------------------------
-- RPC: 자가서비스 신청 (planner_profiles 소유자만, upsert - 이미 승인된 건은 재신청 불가)
-- ---------------------------------------------------------
create or replace function public.submit_top_designer_certification(
  p_planner_profile_id uuid,
  p_job_title text,
  p_income_doc_path text,
  p_declared_annual_income_krw bigint default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_owner_of_planner_profile(p_planner_profile_id) then
    raise exception 'NOT_AUTHORIZED';
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

  insert into public.top_designer_certifications (
    planner_profile_id, job_title, income_doc_storage_path, declared_annual_income_krw
  ) values (
    p_planner_profile_id, trim(p_job_title), p_income_doc_path, p_declared_annual_income_krw
  )
  on conflict (planner_profile_id) do update set
    job_title = excluded.job_title,
    income_doc_storage_path = excluded.income_doc_storage_path,
    declared_annual_income_krw = excluded.declared_annual_income_krw,
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

grant execute on function public.submit_top_designer_certification(uuid, text, text, bigint) to authenticated;

-- ---------------------------------------------------------
-- RPC: 관리자 심사 (승인/보류/반려/재심사 4단계 전이 - 이 코드베이스 최초의 3+상태 패턴)
-- ---------------------------------------------------------
create or replace function public.admin_review_top_designer_certification(
  p_certification_id uuid,
  p_decision text,
  p_star_tier text default null,
  p_confirmed_income_krw bigint default null,
  p_reason text default null
) returns void
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

grant execute on function public.admin_review_top_designer_certification(uuid, text, text, bigint, text) to authenticated;

-- ---------------------------------------------------------
-- 공개 뷰 - 이름/전화 등 비공개, 별등급만 노출(금액은 절대 공개 노출하지 않음)
-- ---------------------------------------------------------
create view public.public_top_designer_certifications
with (security_invoker = true) as
select
  c.id,
  c.planner_profile_id,
  c.job_title,
  c.star_tier,
  c.reviewed_at as certified_at,
  c.created_at,
  p.profile_photo_path,
  p.active_region_id,
  p.career_years,
  p.specialties,
  p.self_introduction
from public.top_designer_certifications c
join public.planner_profiles p on p.id = c.planner_profile_id
where c.status = 'approved' and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_top_designer_certifications to anon, authenticated;

-- ---------------------------------------------------------
-- 스토리지 - 원천징수영수증 업로드 (0034의 owner-scoped 패턴과 동일)
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'top-designer-income-docs', 'top-designer-income-docs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "top designer docs: insert by owner or admin"
  on storage.objects for insert
  with check (
    bucket_id = 'top-designer-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "top designer docs: select by owner or admin"
  on storage.objects for select
  using (
    bucket_id = 'top-designer-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "top designer docs: delete by owner or admin"
  on storage.objects for delete
  using (
    bucket_id = 'top-designer-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );
