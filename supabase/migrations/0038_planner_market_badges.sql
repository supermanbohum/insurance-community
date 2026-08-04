-- =========================================================
-- 0038_planner_market_badges.sql
-- 설계사 마켓 UI/UX 개선: (A) 취급 보험사 완전 제거, (B) 단일 목적이던
-- planner_market_certifications(tier='verified' 하나뿐)를 범용 확장형 배지
-- 시스템으로 교체한다. 등록 당시 데이터가 없어(실사용자 0명) 안전하게 스키마를
-- 갈아엎는다 - 실제 서비스 데이터가 쌓인 뒤였다면 별도 마이그레이션 전략이 필요했을 것.
--
-- 이번에도 TOP설계사(planner_certifications, 0024/0027)는 절대 건드리지 않는다.
-- 아래 시드값 중 'top_planner'(⭐ TOP 설계사)는 사용자가 예시로 든 배지 라벨일 뿐,
-- TOP설계사 테이블/RPC와는 완전히 무관한 planner_badges의 새 행이다 - 데이터도
-- 로직도 전혀 연결되지 않는다.
--
-- (B) 확장성: 새 배지 종류가 필요해지면 planner_badge_types에 행 하나만 추가하면
-- 되고(예: MDRT/COT/TOT/우수후기/Premium/Gold/Diamond), self_applicable=false인
-- 배지는 admin_grant_planner_badge()로 관리자가 바로 부여할 수 있어 DB 스키마
-- 변경이나 새 RPC 없이도 확장된다. 서류 제출이 필요한 배지만 requires_document=true로
-- 두면 기존 submit_planner_badge_application()이 그대로 처리한다.
--
-- 0037 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- (A) 취급 보험사 완전 제거
-- ---------------------------------------------------------

drop view if exists public.public_planner_profiles;

drop function if exists public.submit_planner_market_profile(
  text, text, text, uuid, int, text[], uuid[], boolean, boolean,
  boolean, boolean, boolean, boolean, boolean, text, text, text, uuid, uuid, text
);
drop function if exists public.update_planner_market_profile(
  uuid, text, text, text, uuid, int, text[], uuid[], boolean, boolean, text, text, text, uuid, uuid, text
);

drop table if exists public.planner_profile_insurers;

-- ---------------------------------------------------------
-- (B) 기존 단일 목적 인증(planner_market_certifications) 제거 - 범용 배지
-- 시스템으로 대체한다. TOP설계사(planner_certifications)는 이 파일에서 전혀
-- 손대지 않는다(테이블명이 비슷해 보여도 완전히 다른 테이블).
-- ---------------------------------------------------------

drop function if exists public.submit_planner_market_certification(uuid, text);
drop function if exists public.admin_review_planner_market_certification(uuid, text, text);
drop policy if exists "member reads own planner market verification documents" on public.verification_documents;
drop table if exists public.planner_market_certifications;

-- verification_documents(0024) 허용목록에서 이번에 안 쓰는 값은 빼고, 새 값으로 교체한다.
-- 실사용 데이터가 없어(등록 0건) 바로 좁혀도 안전하지만, 혹시 남은 테스트 행은 먼저 정리한다.
delete from public.verification_documents where owner_type = 'planner_market_certification';

alter table public.verification_documents drop constraint if exists verification_documents_owner_type_check;
alter table public.verification_documents add constraint verification_documents_owner_type_check
  check (owner_type in ('planner_certification', 'planner_badge'));

alter table public.verification_documents drop constraint if exists verification_documents_doc_type_check;
alter table public.verification_documents add constraint verification_documents_doc_type_check
  check (doc_type in ('withholding_tax_certificate', 'badge_document'));

-- ---------------------------------------------------------
-- 배지 카탈로그 - 새 배지 종류는 이 테이블에 행만 추가하면 된다.
-- self_applicable=true인 배지만 설계사 본인이 신청할 수 있고(연봉 인증처럼),
-- 나머지는 관리자가 admin_grant_planner_badge()로 직접 부여한다.
-- ---------------------------------------------------------
create table if not exists public.planner_badge_types (
  code text primary key,
  label text not null,
  icon text not null,
  description text,
  requires_document boolean not null default false,
  self_applicable boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.planner_badge_types (code, label, icon, description, requires_document, self_applicable, sort_order) values
  ('income_verified', '연봉 인증', '🏆', '직전 연봉 증빙 서류(원천징수영수증/소득금액증명원) 심사를 통과한 설계사입니다. 실제 금액은 공개되지 않습니다.', true, true, 10),
  ('top_planner', 'TOP 설계사', '⭐', '보험맵이 우수 실적을 인정해 부여하는 배지입니다.', false, false, 20),
  ('verified_identity', '본인 인증', '✔', '이메일 인증을 완료한 보험맵 회원입니다.', false, false, 30)
on conflict (code) do nothing;

-- ---------------------------------------------------------
-- 배지 부여 - (planner_profile_id, badge_type_code) 당 한 행. 재신청/재검토 모두
-- 이 한 행을 갱신하는 방식이라 이력이 여러 행으로 흩어지지 않는다.
-- ---------------------------------------------------------
create table if not exists public.planner_badges (
  id uuid primary key default gen_random_uuid(),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  badge_type_code text not null references public.planner_badge_types(code),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  granted_by_admin_id uuid references public.admin_users(id),
  granted_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (planner_profile_id, badge_type_code)
);

create index if not exists idx_planner_badges_profile on public.planner_badges(planner_profile_id);
create index if not exists idx_planner_badges_status on public.planner_badges(status);

do $$
begin
  drop trigger if exists trg_set_updated_at on public.planner_badges;
  create trigger trg_set_updated_at before update on public.planner_badges
    for each row execute function public.set_updated_at();
end $$;

alter table public.planner_badge_types enable row level security;
alter table public.planner_badges enable row level security;

-- 카탈로그는 활성 항목만 공개(등록폼/검색필터가 동적으로 렌더링) - regions/insurers와 동일한 공개 조회 관례.
create policy "anyone reads active badge types" on public.planner_badge_types
  for select using (is_active = true);

create policy "member reads own planner badges" on public.planner_badges
  for select using (
    exists (
      select 1 from public.planner_profiles pp
      where pp.id = planner_badges.planner_profile_id and pp.user_id = public.current_member_id()
    )
  );

create policy "member reads own planner badge documents" on public.verification_documents
  for select using (
    owner_type = 'planner_badge'
    and exists (
      select 1 from public.planner_badges b
      join public.planner_profiles pp on pp.id = b.planner_profile_id
      where b.id = verification_documents.owner_id and pp.user_id = public.current_member_id()
    )
  );

-- ---------------------------------------------------------
-- 배지 신청 - self_applicable 배지만, upsert라서 반려 후 재신청이 같은 행을
-- pending_review로 되돌린다(별도 "재신청" RPC 불필요). 이미 승인된 배지는
-- 재신청으로 함부로 되돌리지 않는다 - 되돌리려면 관리자의 재검토 액션을 거친다.
-- ---------------------------------------------------------
create or replace function public.submit_planner_badge_application(
  p_planner_profile_id uuid,
  p_badge_type_code text,
  p_doc_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_type public.planner_badge_types;
  v_badge_id uuid;
begin
  if not public.is_owner_of_planner_profile(p_planner_profile_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_badge_type from public.planner_badge_types where code = p_badge_type_code and is_active = true;
  if v_badge_type.code is null then
    raise exception 'INVALID_BADGE_TYPE';
  end if;
  if not v_badge_type.self_applicable then
    raise exception 'NOT_SELF_APPLICABLE';
  end if;
  if v_badge_type.requires_document and length(trim(coalesce(p_doc_path, ''))) = 0 then
    raise exception 'MISSING_DOCUMENT';
  end if;

  insert into public.planner_badges (planner_profile_id, badge_type_code, status)
  values (p_planner_profile_id, p_badge_type_code, 'pending_review')
  on conflict (planner_profile_id, badge_type_code) do update
    set status = 'pending_review', review_reason = null, granted_by_admin_id = null, granted_at = null, updated_at = now()
    where public.planner_badges.status <> 'approved'
  returning id into v_badge_id;

  if v_badge_id is null then
    raise exception 'ALREADY_APPROVED';
  end if;

  if v_badge_type.requires_document then
    insert into public.verification_documents (owner_type, owner_id, doc_type, storage_path)
    values ('planner_badge', v_badge_id, 'badge_document', p_doc_path);
  end if;

  return v_badge_id;
end;
$$;

grant execute on function public.submit_planner_badge_application(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 관리자 승인/반려/재검토.
-- ---------------------------------------------------------
create or replace function public.admin_review_planner_badge(
  p_badge_id uuid,
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
  v_badge public.planner_badges;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_badge from public.planner_badges where id = p_badge_id;
  if v_badge.id is null then
    raise exception 'BADGE_NOT_FOUND';
  end if;
  if v_badge.status <> 'pending_review' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  update public.planner_badges
  set status = p_decision,
      granted_by_admin_id = v_admin_id,
      granted_at = case when p_decision = 'approved' then now() else granted_at end,
      review_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_badge_id;
end;
$$;

grant execute on function public.admin_review_planner_badge(uuid, text, text) to authenticated;

-- 이미 승인/반려된 배지를 다시 심사 대기로 되돌린다(예: 승인 후 이상 징후 발견 시 재검토).
create or replace function public.admin_reset_planner_badge_for_review(p_badge_id uuid)
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

  update public.planner_badges
  set status = 'pending_review', review_reason = null, updated_at = now()
  where id = p_badge_id;

  if not found then
    raise exception 'BADGE_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.admin_reset_planner_badge_for_review(uuid) to authenticated;

-- ---------------------------------------------------------
-- 관리자 수동 부여/회수 - self_applicable=false인 배지(TOP 설계사 등)를 서류 없이
-- 바로 승인 상태로 부여할 때 쓴다. 향후 새 배지 종류가 추가돼도 이 두 RPC만으로
-- 관리자가 즉시 부여/회수할 수 있다(코드 변경 불필요).
-- ---------------------------------------------------------
create or replace function public.admin_grant_planner_badge(
  p_planner_profile_id uuid,
  p_badge_type_code text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_badge_id uuid;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if not exists (select 1 from public.planner_badge_types where code = p_badge_type_code and is_active = true) then
    raise exception 'INVALID_BADGE_TYPE';
  end if;

  insert into public.planner_badges (planner_profile_id, badge_type_code, status, granted_by_admin_id, granted_at, review_reason)
  values (p_planner_profile_id, p_badge_type_code, 'approved', v_admin_id, now(), nullif(trim(coalesce(p_reason, '')), ''))
  on conflict (planner_profile_id, badge_type_code) do update
    set status = 'approved', granted_by_admin_id = v_admin_id, granted_at = now(),
        review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  returning id into v_badge_id;

  return v_badge_id;
end;
$$;

grant execute on function public.admin_grant_planner_badge(uuid, text, text) to authenticated;

create or replace function public.admin_revoke_planner_badge(p_badge_id uuid, p_reason text default null)
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

  update public.planner_badges
  set status = 'rejected', granted_by_admin_id = v_admin_id,
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_badge_id;

  if not found then
    raise exception 'BADGE_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.admin_revoke_planner_badge(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- 설계사 등록/수정 RPC 재생성 - 취급 보험사 파라미터 제거. 등록 시 "본인 인증"
-- 배지를 자동으로 즉시 승인 부여한다(is_full_member()가 이미 이메일 인증을
-- 전제하므로 별도 심사 없이 사실에 부합).
-- ---------------------------------------------------------
create or replace function public.submit_planner_market_profile(
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_currently_employed boolean,
  p_open_to_move boolean,
  p_consent_contact_paid_view boolean,
  p_consent_recruit_contact boolean,
  p_consent_privacy_policy boolean,
  p_consent_third_party_share boolean,
  p_consent_withdrawal_notice boolean,
  p_kakao_id text default null,
  p_profile_photo_path text default null,
  p_self_introduction text default null,
  p_desired_region_id uuid default null,
  p_desired_ga_company_id uuid default null,
  p_desired_conditions text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
begin
  if not public.is_full_member() then
    raise exception 'NOT_FULL_MEMBER';
  end if;
  v_user_id := public.current_member_id();

  if exists (select 1 from public.planner_profiles where user_id = v_user_id and withdrawn_at is null) then
    raise exception 'PROFILE_ALREADY_EXISTS';
  end if;

  if length(trim(p_name)) = 0 or length(trim(p_phone)) = 0 or length(trim(p_email)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if not exists (select 1 from public.regions where id = p_active_region_id) then
    raise exception 'INVALID_REGION';
  end if;
  if not (
    p_consent_contact_paid_view and p_consent_recruit_contact and p_consent_privacy_policy
    and p_consent_third_party_share and p_consent_withdrawal_notice
  ) then
    raise exception 'CONSENT_REQUIRED';
  end if;

  insert into public.planner_profiles (
    user_id, name, phone, email, kakao_id, profile_photo_path,
    active_region_id, career_years, specialties, self_introduction,
    currently_employed, open_to_move, desired_region_id, desired_ga_company_id, desired_conditions,
    consent_contact_paid_view, consent_recruit_contact, consent_privacy_policy,
    consent_third_party_share, consent_withdrawal_notice, consent_agreed_at
  ) values (
    v_user_id, trim(p_name), trim(p_phone), trim(p_email), nullif(trim(coalesce(p_kakao_id, '')), ''), p_profile_photo_path,
    p_active_region_id, greatest(p_career_years, 0), coalesce(p_specialties, '{}'), p_self_introduction,
    p_currently_employed, p_open_to_move, p_desired_region_id, p_desired_ga_company_id, p_desired_conditions,
    true, true, true, true, true, now()
  ) returning id into v_profile_id;

  insert into public.planner_badges (planner_profile_id, badge_type_code, status, granted_at)
  values (v_profile_id, 'verified_identity', 'approved', now())
  on conflict (planner_profile_id, badge_type_code) do nothing;

  return v_profile_id;
end;
$$;

grant execute on function public.submit_planner_market_profile(
  text, text, text, uuid, int, text[], boolean, boolean,
  boolean, boolean, boolean, boolean, boolean, text, text, text, uuid, uuid, text
) to authenticated;

create or replace function public.update_planner_market_profile(
  p_planner_profile_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_currently_employed boolean,
  p_open_to_move boolean,
  p_kakao_id text default null,
  p_profile_photo_path text default null,
  p_self_introduction text default null,
  p_desired_region_id uuid default null,
  p_desired_ga_company_id uuid default null,
  p_desired_conditions text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.planner_profiles;
begin
  select * into v_profile from public.planner_profiles where id = p_planner_profile_id;
  if v_profile.id is null or v_profile.user_id <> public.current_member_id() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_profile.withdrawn_at is not null then
    raise exception 'PROFILE_WITHDRAWN';
  end if;
  if length(trim(p_name)) = 0 or length(trim(p_phone)) = 0 or length(trim(p_email)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.planner_profiles set
    name = trim(p_name), phone = trim(p_phone), email = trim(p_email),
    kakao_id = nullif(trim(coalesce(p_kakao_id, '')), ''), profile_photo_path = p_profile_photo_path,
    active_region_id = p_active_region_id, career_years = greatest(p_career_years, 0),
    specialties = coalesce(p_specialties, '{}'), self_introduction = p_self_introduction,
    currently_employed = p_currently_employed, open_to_move = p_open_to_move,
    desired_region_id = p_desired_region_id, desired_ga_company_id = p_desired_ga_company_id,
    desired_conditions = p_desired_conditions,
    status = 'pending_review', reviewed_by_admin_id = null, reviewed_at = null, review_reason = null,
    updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.update_planner_market_profile(
  uuid, text, text, text, uuid, int, text[], boolean, boolean, text, text, text, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------
-- 공개 뷰 재생성 - 취급보험사(insurer_ids) 제거, 배지 배열 + 정렬용 플래그 추가.
-- 기본 정렬 우선순위(①연봉인증→②TOP설계사→③최신등록)는 이 뷰의 has_income_verified/
-- has_top_planner 컬럼을 애플리케이션 쿼리가 order by에 사용한다.
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
  coalesce(badge_agg.badges, '[]'::jsonb) as badges,
  exists (
    select 1 from public.planner_badges b
    where b.planner_profile_id = p.id and b.badge_type_code = 'income_verified' and b.status = 'approved'
  ) as has_income_verified,
  exists (
    select 1 from public.planner_badges b
    where b.planner_profile_id = p.id and b.badge_type_code = 'top_planner' and b.status = 'approved'
  ) as has_top_planner
from public.planner_profiles p
left join lateral (
  select jsonb_agg(jsonb_build_object('code', bt.code, 'label', bt.label, 'icon', bt.icon) order by bt.sort_order) as badges
  from public.planner_badges b
  join public.planner_badge_types bt on bt.code = b.badge_type_code
  where b.planner_profile_id = p.id and b.status = 'approved'
) badge_agg on true
where p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_planner_profiles to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.planner_badge_types order by sort_order;
-- select * from public.public_planner_profiles limit 5;
-- select proname from pg_proc where proname like '%planner_badge%';
