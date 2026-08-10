-- =========================================================
-- 0087_branch_planner_registrations.sql
-- ③ 지점→설계사 등록 흐름(오너 지시, 2026-08-10) — "우리 지점 설계사 등록"(ⓑ).
-- planner_certifications(레거시, admin 대신등록+유료애드온 전제)는 재사용하지 않는다
-- (재사용 여부 CTO 승인 - 0건 데이터, 새 사양과 소유구조·과금개념이 안 맞는다). 완전
-- 신규 테이블. TOP 설계사(top_designer_certifications, 0055/0082)와도 별개 테이블이다
-- - ⓑ를 마친 사람만 ⓒ(TOP)를 신청할 수 있는 순서 관계는 있지만, 스키마는 독립이다.
--
-- 오너 사양 그대로: 로그인 + 지점 연결 필수, 명함 필수, 소득증빙은 선택(첨부해야
-- TOP 신청 자격이 생기고, 미첨부면 GA 점수에 "1억 미만 1점"으로만 산입 - 0088에서 배선).
-- 직급은 오너가 준 목록(대표/본부장/사업단장/지점장/부지점장/팀장/기타)을 그대로 받는다
-- - "설계사" 항목이 없는 것도, 관리직 차단이 없는 것도 오너 확정 사항이다(⑩ 결정과
-- 동일하게 TOP 경로에는 관리직 차단이 없다).
--
-- 관리자 심사 필요(CTO 판단, 오너 원문엔 심사 언급 없었으나 사양 자체가 요구함 -
-- 명함은 "아무도 안 보면 받을 이유가 없고", 미제출자도 GA 점수에 들어가므로 심사 없이는
-- 소속 사칭으로 점수 조작이 가능해진다). top_designer_certifications와 동일한
-- pending_review/on_hold/rejected/approved 4단계 + on_hold에서 되돌리기 패턴을 그대로
-- 따른다. 심사 완료(승인/반려) 후 서류를 파기하는 정책도 TOP과 동일하게 적용한다
-- (콘텐츠팀이 이미 확정한 "심사 완료 후 지체 없이 파기" 원칙을 같은 성격의 서류에
-- 다르게 적용할 이유가 없다는 판단 - 이견 있으면 CTO에게 확인받을 것).
--
-- 🔴 branch_id는 top_designer_certifications에도 nullable로 추가한다(CTO 지시, 지금
-- 넣지 않으면 나중에 백필 불가 - branch_name이 자유텍스트라 매칭할 수 없다). ⓒ(TOP)
-- 신청은 항상 ⓑ를 마친 사람만 가능하므로 자동 채워진다(다음 단계 폼에서 배선).
--
-- appointed_at(위촉일, date)도 top_designer_certifications에 nullable로 추가한다
-- (CTO 지시). 기존 career_years(int)는 그대로 둔다(이미 들어간 값 보호) - 폼은 앞으로
-- appointed_at만 받고, 상세 화면은 있으면 appointed_at 기준으로 환산해 보여준다.
-- =========================================================

-- ---------------------------------------------------------
-- 1. top_designer_certifications 컬럼 추가 (기존 마이그레이션 파일은 건드리지 않는다)
-- ---------------------------------------------------------
alter table public.top_designer_certifications
  add column if not exists appointed_at date,
  add column if not exists branch_id uuid references public.ga_branch(id);

-- ---------------------------------------------------------
-- 2. branch_planner_registrations 테이블
-- ---------------------------------------------------------
create table public.branch_planner_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  branch_id uuid not null references public.ga_branch(id),
  name text not null,
  job_title text not null,
  business_card_path text not null,
  income_doc_storage_path text,
  declared_annual_income_krw bigint,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'on_hold', 'rejected', 'approved')),
  review_reason text,
  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_planner_registrations_user_id_key unique (user_id)
);

create index branch_planner_registrations_branch_id_idx on public.branch_planner_registrations (branch_id);

alter table public.branch_planner_registrations enable row level security;

create policy "member reads own branch planner registration" on public.branch_planner_registrations
  for select using (user_id = public.current_member_id());

-- ---------------------------------------------------------
-- 3. 신청 RPC - 본인 등록(오너: "원천징수는 본인이 올리는것"과 동일 원칙, 지점 관리자
--    대신등록이 아니다). 재신청은 승인 전까지 수정으로 처리한다(top_designer와 동일).
-- ---------------------------------------------------------
create or replace function public.submit_branch_planner_registration(
  p_branch_id uuid,
  p_name text,
  p_job_title text,
  p_business_card_path text,
  p_income_doc_path text default null,
  p_declared_annual_income_krw bigint default null
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

  if not exists (select 1 from public.ga_branch where id = p_branch_id) then
    raise exception 'INVALID_BRANCH';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if length(trim(coalesce(p_job_title, ''))) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if length(trim(coalesce(p_business_card_path, ''))) = 0 then
    raise exception 'MISSING_BUSINESS_CARD';
  end if;
  if p_income_doc_path is not null and (p_declared_annual_income_krw is null or p_declared_annual_income_krw <= 0) then
    raise exception 'INVALID_INCOME';
  end if;

  insert into public.branch_planner_registrations (
    user_id, branch_id, name, job_title, business_card_path, income_doc_storage_path, declared_annual_income_krw
  ) values (
    v_user_id, p_branch_id, trim(p_name), trim(p_job_title), p_business_card_path, p_income_doc_path, p_declared_annual_income_krw
  )
  on conflict (user_id) do update set
    branch_id = excluded.branch_id,
    name = excluded.name,
    job_title = excluded.job_title,
    business_card_path = excluded.business_card_path,
    income_doc_storage_path = excluded.income_doc_storage_path,
    declared_annual_income_krw = excluded.declared_annual_income_krw,
    status = 'pending_review',
    review_reason = null,
    reviewed_by_admin_id = null,
    reviewed_at = null,
    updated_at = now()
  where public.branch_planner_registrations.status <> 'approved'
  returning id into v_id;

  if v_id is null then
    raise exception 'ALREADY_APPROVED';
  end if;

  return v_id;
end;
$$;

grant execute on function public.submit_branch_planner_registration(uuid, text, text, text, text, bigint) to authenticated;

-- ---------------------------------------------------------
-- 4. 관리자 심사 RPC - top_designer와 동일한 4단계 패턴(승인/보류/반려/되돌리기).
--    star_tier·confirmed_income 개념이 없다(그건 TOP 심사의 몫) - 소속(명함) 확인만.
--    🔴 top_designer_certifications와 동일한 이유로 스토리지 파일 자체는 여기서 못
--    지운다(storage.protect_delete 트리거) - 경로 컬럼만 비우고, 실제 파일 삭제는
--    호출하는 TS 서버 액션이 admin Storage API로 수행한다.
-- ---------------------------------------------------------
create or replace function public.admin_review_branch_planner_registration(
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
  v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'on_hold', 'rejected', 'pending_review') then
    raise exception 'INVALID_DECISION';
  end if;
  if not exists (select 1 from public.branch_planner_registrations where id = p_registration_id) then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;

  if p_decision = 'approved' then
    update public.branch_planner_registrations set
      status = 'approved',
      review_reason = null,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      business_card_path = null,
      income_doc_storage_path = null,
      updated_at = now()
    where id = p_registration_id;
  elsif p_decision in ('on_hold', 'rejected') then
    if length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    update public.branch_planner_registrations set
      status = p_decision,
      review_reason = trim(p_reason),
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      business_card_path = case when p_decision = 'rejected' then null else business_card_path end,
      income_doc_storage_path = case when p_decision = 'rejected' then null else income_doc_storage_path end,
      updated_at = now()
    where id = p_registration_id;
  else
    update public.branch_planner_registrations set
      status = 'pending_review',
      review_reason = null,
      reviewed_by_admin_id = null,
      reviewed_at = null,
      updated_at = now()
    where id = p_registration_id;
  end if;
end;
$$;

grant execute on function public.admin_review_branch_planner_registration(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 5. 소유자 확인 헬퍼 + 스토리지 정책(top_designer-income-docs와 동일 패턴).
-- ---------------------------------------------------------
create or replace function public.is_owner_of_branch_planner_registration(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = public.current_member_id();
$$;

insert into storage.buckets (id, name, public)
values ('branch-planner-registration-docs', 'branch-planner-registration-docs', false)
on conflict (id) do nothing;

create policy "branch planner docs: insert by owner or admin" on storage.objects
  for insert with check (
    bucket_id = 'branch-planner-registration-docs'
    and (current_admin_id() is not null or public.is_owner_of_branch_planner_registration(((storage.foldername(name))[1])::uuid))
  );
create policy "branch planner docs: select by owner or admin" on storage.objects
  for select using (
    bucket_id = 'branch-planner-registration-docs'
    and (current_admin_id() is not null or public.is_owner_of_branch_planner_registration(((storage.foldername(name))[1])::uuid))
  );
create policy "branch planner docs: delete by owner or admin" on storage.objects
  for delete using (
    bucket_id = 'branch-planner-registration-docs'
    and (current_admin_id() is not null or public.is_owner_of_branch_planner_registration(((storage.foldername(name))[1])::uuid))
  );

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name from information_schema.columns where table_name='branch_planner_registrations' order by ordinal_position;
-- select column_name from information_schema.columns where table_name='top_designer_certifications' and column_name in ('appointed_at','branch_id');
