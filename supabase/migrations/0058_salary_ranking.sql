-- =========================================================
-- 0058_salary_ranking.sql
-- 전국 설계사 연봉 랭킹 - TOP 설계사(top_designer_*)와 테이블/RPC 완전 분리된
-- "완전 별도" 시스템(salary_ranking_ 접두사). PlannerMarketRegisterForm에는
-- 연결하지 않고 독립된 /salary-ranking/apply 페이지로만 신청한다.
--
-- planner_profiles.name을 그대로 공개 노출하지 않기 위해 display_name(공개용
-- 별도 필드)과 consent_public_display(랭킹 공개 전용 단일 동의, 설계사마켓의
-- 5개 동의와 별개)를 둔다.
-- =========================================================

create table public.salary_ranking_submissions (
  id uuid primary key default gen_random_uuid(),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  ranking_year int not null check (ranking_year between 2020 and 2100),
  job_title text not null,
  display_name text not null,
  income_doc_storage_path text not null,
  declared_annual_income_krw bigint not null check (declared_annual_income_krw > 0),
  confirmed_annual_income_krw bigint check (confirmed_annual_income_krw is null or confirmed_annual_income_krw > 0),
  consent_public_display boolean not null default false,
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
  unique (planner_profile_id, ranking_year),
  check (status <> 'approved' or confirmed_annual_income_krw is not null)
);

create index idx_salary_ranking_year_status on public.salary_ranking_submissions(ranking_year, status);

create trigger trg_salary_ranking_submissions_updated_at
  before update on public.salary_ranking_submissions
  for each row execute function public.set_updated_at();

alter table public.salary_ranking_submissions enable row level security;

create policy "member reads own salary ranking submission"
  on public.salary_ranking_submissions for select
  using (public.is_owner_of_planner_profile(planner_profile_id));

-- ---------------------------------------------------------
-- RPC: 자가서비스 신청 (연도별 upsert, top_designer와 동일한 직급 블록리스트 재사용)
-- ---------------------------------------------------------
create or replace function public.submit_salary_ranking(
  p_planner_profile_id uuid,
  p_ranking_year int,
  p_job_title text,
  p_display_name text,
  p_income_doc_path text,
  p_declared_annual_income_krw bigint,
  p_consent_public_display boolean
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
  if p_ranking_year < 2020 or p_ranking_year > extract(year from now())::int then
    raise exception 'INVALID_YEAR';
  end if;
  if length(trim(coalesce(p_job_title, ''))) = 0 or length(trim(coalesce(p_display_name, ''))) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if public.is_blocked_designer_job_title(p_job_title) then
    raise exception 'BLOCKED_JOB_TITLE';
  end if;
  if length(trim(coalesce(p_income_doc_path, ''))) = 0 then
    raise exception 'MISSING_INCOME_DOCUMENT';
  end if;
  if p_declared_annual_income_krw <= 0 then
    raise exception 'INVALID_INCOME';
  end if;
  if not p_consent_public_display then
    raise exception 'CONSENT_REQUIRED';
  end if;

  insert into public.salary_ranking_submissions (
    planner_profile_id, ranking_year, job_title, display_name, income_doc_storage_path,
    declared_annual_income_krw, consent_public_display
  ) values (
    p_planner_profile_id, p_ranking_year, trim(p_job_title), trim(p_display_name), p_income_doc_path,
    p_declared_annual_income_krw, true
  )
  on conflict (planner_profile_id, ranking_year) do update set
    job_title = excluded.job_title,
    display_name = excluded.display_name,
    income_doc_storage_path = excluded.income_doc_storage_path,
    declared_annual_income_krw = excluded.declared_annual_income_krw,
    consent_public_display = true,
    status = 'pending_review',
    review_reason = null,
    reviewed_by_admin_id = null,
    reviewed_at = null,
    ocr_status = 'not_run',
    ocr_extracted_income_krw = null,
    ocr_raw_response = null,
    ocr_confidence = null,
    updated_at = now()
  where public.salary_ranking_submissions.status <> 'approved'
  returning id into v_id;

  if v_id is null then
    raise exception 'ALREADY_APPROVED_FOR_YEAR';
  end if;

  return v_id;
end;
$$;

grant execute on function public.submit_salary_ranking(uuid, int, text, text, text, bigint, boolean) to authenticated;

-- ---------------------------------------------------------
-- RPC: 관리자 심사 (top_designer와 동일한 4단계, 별등급 없이 금액만 확정)
-- ---------------------------------------------------------
create or replace function public.admin_review_salary_ranking(
  p_submission_id uuid,
  p_decision text,
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
  if not exists (select 1 from public.salary_ranking_submissions where id = p_submission_id) then
    raise exception 'SUBMISSION_NOT_FOUND';
  end if;

  if p_decision = 'approved' then
    if p_confirmed_income_krw is null or p_confirmed_income_krw <= 0 then
      raise exception 'INVALID_CONFIRMED_INCOME';
    end if;
    update public.salary_ranking_submissions set
      status = 'approved',
      confirmed_annual_income_krw = p_confirmed_income_krw,
      review_reason = null,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_submission_id;
  elsif p_decision in ('on_hold', 'rejected') then
    if length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    update public.salary_ranking_submissions set
      status = p_decision,
      review_reason = trim(p_reason),
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_submission_id;
  else
    update public.salary_ranking_submissions set
      status = 'pending_review',
      review_reason = null,
      reviewed_by_admin_id = null,
      reviewed_at = null,
      updated_at = now()
    where id = p_submission_id;
  end if;
end;
$$;

grant execute on function public.admin_review_salary_ranking(uuid, text, bigint, text) to authenticated;

-- ---------------------------------------------------------
-- 공개 뷰 - 랭킹 기능의 핵심이므로 금액을 의도적으로 공개 노출한다(TOP설계사와 다름).
-- ---------------------------------------------------------
create view public.public_salary_ranking_submissions
with (security_invoker = true) as
select
  s.id,
  s.planner_profile_id,
  s.ranking_year,
  s.job_title,
  s.display_name,
  s.confirmed_annual_income_krw as annual_income_krw,
  s.reviewed_at as ranked_at,
  s.created_at,
  p.profile_photo_path,
  p.active_region_id
from public.salary_ranking_submissions s
join public.planner_profiles p on p.id = s.planner_profile_id
where s.status = 'approved' and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_salary_ranking_submissions to anon, authenticated;

-- ---------------------------------------------------------
-- 스토리지
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'salary-ranking-income-docs', 'salary-ranking-income-docs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "salary ranking docs: insert by owner or admin"
  on storage.objects for insert
  with check (
    bucket_id = 'salary-ranking-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "salary ranking docs: select by owner or admin"
  on storage.objects for select
  using (
    bucket_id = 'salary-ranking-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "salary ranking docs: delete by owner or admin"
  on storage.objects for delete
  using (
    bucket_id = 'salary-ranking-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );
