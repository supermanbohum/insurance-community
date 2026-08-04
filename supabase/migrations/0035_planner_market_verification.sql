-- =========================================================
-- 0035_planner_market_verification.sql
-- 설계사 마켓 전용 "인증 설계사" 배지 - TOP설계사의 planner_certifications와는
-- 완전히 별개인 새 테이블이다(0034 헤더 설명 참고, 데이터 절대 공유 안 함).
-- 소득증빙 서류(원천징수영수증/소득금액증명원)는 기존 범용 폴리모픽 문서 저장소인
-- public.verification_documents(0024)를 재사용한다 - 그 테이블 자체는 owner_type으로
-- 여러 인증 유형을 수용하도록 원래 설계되어 있으므로, 이번엔 값만 하나 추가한다.
-- planner_certifications 테이블/RPC/관리자 화면은 이 마이그레이션에서 전혀 건드리지 않는다.
--
-- 이 파일에서 함께 만드는 public_planner_profiles 뷰가 "설계사 찾기"의 유일한 공개
-- 조회 경로다 - 비공개 컬럼(이름/연락처/이메일/카카오톡)은 이 뷰에 없다.
--
-- 0034 적용 후 실행.
-- =========================================================

create table if not exists public.planner_market_certifications (
  id uuid primary key default gen_random_uuid(),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  tier text not null default 'verified' check (tier in ('verified')), -- 향후 등급 확장 시 이 체크만 넓히면 됨
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  approved_by_admin_id uuid references public.admin_users(id),
  approved_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planner_market_cert_profile on public.planner_market_certifications(planner_profile_id);
create index if not exists idx_planner_market_cert_status on public.planner_market_certifications(status);

do $$
begin
  drop trigger if exists trg_set_updated_at on public.planner_market_certifications;
  create trigger trg_set_updated_at before update on public.planner_market_certifications
    for each row execute function public.set_updated_at();
end $$;

alter table public.planner_market_certifications enable row level security;

create policy "member reads own planner market certification"
  on public.planner_market_certifications for select
  using (
    exists (
      select 1 from public.planner_profiles pp
      where pp.id = planner_market_certifications.planner_profile_id
        and pp.user_id = public.current_member_id()
    )
  );

-- ---------------------------------------------------------
-- verification_documents(0024)의 owner_type/doc_type 체크 제약을 넓혀 새 값을
-- 허용한다 - planner_certifications 자체는 손대지 않는, 공용 문서 저장소의
-- 허용목록 확장일 뿐이다. 제약 이름은 0024가 인라인 column check로 만들어
-- Postgres 기본 명명규칙(<table>_<column>_check)을 그대로 따른다.
-- ---------------------------------------------------------
alter table public.verification_documents drop constraint if exists verification_documents_owner_type_check;
alter table public.verification_documents add constraint verification_documents_owner_type_check
  check (owner_type in ('planner_certification', 'planner_market_certification'));

alter table public.verification_documents drop constraint if exists verification_documents_doc_type_check;
alter table public.verification_documents add constraint verification_documents_doc_type_check
  check (doc_type in ('withholding_tax_certificate', 'income_proof'));

-- planner_certifications용 기존 정책(0024)은 그대로 두고, 설계사 마켓용 정책만 추가한다.
create policy "member reads own planner market verification documents"
  on public.verification_documents for select
  using (
    owner_type = 'planner_market_certification'
    and exists (
      select 1 from public.planner_market_certifications c
      join public.planner_profiles pp on pp.id = c.planner_profile_id
      where c.id = verification_documents.owner_id and pp.user_id = public.current_member_id()
    )
  );

-- ---------------------------------------------------------
-- 인증 신청 - 소유자만, 이미 심사 대기 중인 신청이 있으면 중복 신청을 막는다.
-- ---------------------------------------------------------
create or replace function public.submit_planner_market_certification(
  p_planner_profile_id uuid,
  p_income_doc_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_certification_id uuid;
begin
  if not public.is_owner_of_planner_profile(p_planner_profile_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if exists (
    select 1 from public.planner_market_certifications
    where planner_profile_id = p_planner_profile_id and status = 'pending_review'
  ) then
    raise exception 'CERTIFICATION_ALREADY_PENDING';
  end if;
  if length(trim(coalesce(p_income_doc_path, ''))) = 0 then
    raise exception 'MISSING_INCOME_DOCUMENT';
  end if;

  insert into public.planner_market_certifications (planner_profile_id)
  values (p_planner_profile_id)
  returning id into v_certification_id;

  insert into public.verification_documents (owner_type, owner_id, doc_type, storage_path)
  values ('planner_market_certification', v_certification_id, 'income_proof', p_income_doc_path);

  return v_certification_id;
end;
$$;

grant execute on function public.submit_planner_market_certification(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- 관리자 승인/반려.
-- ---------------------------------------------------------
create or replace function public.admin_review_planner_market_certification(
  p_certification_id uuid,
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
  v_cert public.planner_market_certifications;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_cert from public.planner_market_certifications where id = p_certification_id;
  if v_cert.id is null then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;
  if v_cert.status <> 'pending_review' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  update public.planner_market_certifications
  set status = p_decision,
      approved_by_admin_id = v_admin_id,
      approved_at = case when p_decision = 'approved' then now() else approved_at end,
      review_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_certification_id;
end;
$$;

grant execute on function public.admin_review_planner_market_certification(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 공개 뷰 - "설계사 찾기"의 유일한 공개 조회 경로. security_invoker=true라 원본
-- 테이블 RLS(본인만 select)를 우회하지 않는다 - 대신 grant select를 뷰 자체에
-- 부여해 anon/authenticated가 이 뷰만 통해 안전한 컬럼만 읽게 한다(public_banners와
-- 동일 패턴). 이름/전화/이메일/카카오톡은 여기 없다.
-- ---------------------------------------------------------
create view public.public_planner_profiles
with (security_invoker = true) as
select
  p.id,
  p.profile_photo_path,
  p.active_region_id,
  p.career_years,
  p.specialties,
  p.self_introduction,
  p.currently_employed,
  p.open_to_move,
  p.desired_region_id,
  p.desired_ga_company_id,
  p.desired_conditions,
  p.created_at,
  (
    select array_agg(pi.insurer_id) from public.planner_profile_insurers pi
    where pi.planner_profile_id = p.id
  ) as insurer_ids,
  (
    select c.tier from public.planner_market_certifications c
    where c.planner_profile_id = p.id and c.status = 'approved'
    order by c.approved_at desc limit 1
  ) as badge_tier
from public.planner_profiles p
where p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_planner_profiles to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.verification_documents'::regclass and contype = 'c';
-- select * from public.public_planner_profiles limit 5;
-- select proname from pg_proc where proname like '%planner_market_cert%';
