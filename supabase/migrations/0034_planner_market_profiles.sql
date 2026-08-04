-- =========================================================
-- 0034_planner_market_profiles.sql
-- "설계사 마켓" - 보험 리쿠르팅 플랫폼의 첫 번째 수익 스트림(설계사 열람권)의
-- 핵심 테이블. 기존 "TOP설계사"(planner_certifications, 0024/0027)와는
-- 목적이 완전히 다른 별개 시스템이다 - 절대 그 테이블/RPC를 재사용하지 않는다.
--   - TOP설계사: 이미 소속된 지점의 "고소득 인증" 배지(지점 스코프, branch_id 필수)
--   - 설계사 마켓: 소속과 무관하게 구직 중인 개인의 공개 프로필(사람 스코프,
--     branch_id 없음) + GA가 유료로 연락처를 열람하는 마켓플레이스
--
-- 공개/비공개 분리: 활동지역/경력/전문분야/자기소개/사진/희망조건 등은 공개,
-- 이름/연락처/이메일/카카오톡은 GA가 열람권(0036)을 사용해야만 조회 가능하다.
-- 이 마이그레이션에서는 원본 테이블에 공개 select 정책을 두지 않는다 - 공개 노출은
-- 0035의 public_planner_profiles 뷰를 통해서만 이루어진다.
--
-- 등록 자격: 보험맵 일반회원(is_full_member(), 0028)만 등록 가능. 등록 시 5개
-- 동의 항목이 모두 true여야 한다(연락처 유료열람 동의/채용목적 연락 동의/개인정보
-- 처리방침 동의/제3자 제공 동의/철회 가능 고지) - 이 코드베이스에 기존 동의
-- 체크박스 패턴이 없어 이번에 처음 설계한다.
--
-- 0033 적용 후 실행.
-- =========================================================

create table if not exists public.planner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- 공개 필드
  profile_photo_path text,
  active_region_id uuid not null references public.regions(id),
  career_years int not null default 0 check (career_years >= 0),
  specialties text[] not null default '{}',
  self_introduction text,
  currently_employed boolean not null default false,
  open_to_move boolean not null default true,
  desired_region_id uuid references public.regions(id),
  desired_ga_company_id uuid references public.ga_company(id),
  desired_conditions text,

  -- 비공개 필드 - GA가 get_planner_contact()(0036)로 열람권을 사용해야만 조회 가능
  name text not null,
  phone text not null,
  email text not null,
  kakao_id text,

  -- 승인 상태
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,
  review_reason text,

  -- 자가서비스 - 프로필 비공개/등록 해지/개인정보 제공 철회는 서로 다른 개념이라 별도 컬럼
  is_hidden boolean not null default false,
  withdrawn_at timestamptz,
  contact_sharing_revoked_at timestamptz,

  -- 필수 동의 5종 - 하나라도 false면 등록 자체가 막힌다(submit_planner_market_profile 참고)
  consent_contact_paid_view boolean not null default false,
  consent_recruit_contact boolean not null default false,
  consent_privacy_policy boolean not null default false,
  consent_third_party_share boolean not null default false,
  consent_withdrawal_notice boolean not null default false,
  consent_agreed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 회원 1명당 미철회 프로필은 1건만 - 등록 해지(withdraw) 후에는 재등록 가능하게
-- 부분 유니크 인덱스로 제한한다(행 자체는 감사기록으로 남긴다).
create unique index if not exists idx_planner_profiles_user_active
  on public.planner_profiles(user_id) where withdrawn_at is null;
create index if not exists idx_planner_profiles_status on public.planner_profiles(status);
create index if not exists idx_planner_profiles_active_region on public.planner_profiles(active_region_id);
create index if not exists idx_planner_profiles_desired_ga on public.planner_profiles(desired_ga_company_id);

do $$
begin
  drop trigger if exists trg_set_updated_at on public.planner_profiles;
  create trigger trg_set_updated_at before update on public.planner_profiles
    for each row execute function public.set_updated_at();
end $$;

-- 취급 보험사 - branch_insurers와 동일한 다대다 조인 테이블 모양.
create table if not exists public.planner_profile_insurers (
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  insurer_id uuid not null references public.insurers(id) on delete cascade,
  primary key (planner_profile_id, insurer_id)
);

create index if not exists idx_planner_profile_insurers_insurer on public.planner_profile_insurers(insurer_id);

-- ---------------------------------------------------------
-- RLS - 원본 테이블은 본인만 읽는다. 공개 노출은 0035의 public_planner_profiles
-- 뷰가 전담하고, 연락처는 0036의 get_planner_contact() RPC가 전담한다. 쓰기 정책은
-- 두지 않는다(RPC 전용 관례).
-- ---------------------------------------------------------
alter table public.planner_profiles enable row level security;
alter table public.planner_profile_insurers enable row level security;

create policy "member reads own planner profile"
  on public.planner_profiles for select
  using (user_id = public.current_member_id());

create policy "member reads own planner profile insurers"
  on public.planner_profile_insurers for select
  using (
    exists (
      select 1 from public.planner_profiles pp
      where pp.id = planner_profile_insurers.planner_profile_id
        and pp.user_id = public.current_member_id()
    )
  );

-- ---------------------------------------------------------
-- 소유자 확인 헬퍼 - 스토리지 정책 및 0035/0036의 RPC에서 재사용.
-- ---------------------------------------------------------
create or replace function public.is_owner_of_planner_profile(p_planner_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.planner_profiles
    where id = p_planner_profile_id and user_id = public.current_member_id()
  );
$$;

-- ---------------------------------------------------------
-- 등록 - 일반회원(is_full_member)만 가능. 동의 5종 모두 true여야 하고, 미철회
-- 프로필이 이미 있으면 거부한다(위 부분 유니크 인덱스가 최종 방어선).
-- ---------------------------------------------------------
create or replace function public.submit_planner_market_profile(
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_insurer_ids uuid[],
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

  if p_insurer_ids is not null and array_length(p_insurer_ids, 1) > 0 then
    insert into public.planner_profile_insurers (planner_profile_id, insurer_id)
    select v_profile_id, unnest(p_insurer_ids);
  end if;

  return v_profile_id;
end;
$$;

grant execute on function public.submit_planner_market_profile(
  text, text, text, uuid, int, text[], uuid[], boolean, boolean,
  boolean, boolean, boolean, boolean, boolean, text, text, text, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------
-- 수정 - 소유자만. 내용이 바뀌므로 재검수를 위해 상태를 pending_review로 되돌린다
-- (renew_planner_certification의 "수정=재심사" 관례와 동일).
-- ---------------------------------------------------------
create or replace function public.update_planner_market_profile(
  p_planner_profile_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_active_region_id uuid,
  p_career_years int,
  p_specialties text[],
  p_insurer_ids uuid[],
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

  delete from public.planner_profile_insurers where planner_profile_id = p_planner_profile_id;
  if p_insurer_ids is not null and array_length(p_insurer_ids, 1) > 0 then
    insert into public.planner_profile_insurers (planner_profile_id, insurer_id)
    select p_planner_profile_id, unnest(p_insurer_ids);
  end if;
end;
$$;

grant execute on function public.update_planner_market_profile(
  uuid, text, text, text, uuid, int, text[], uuid[], boolean, boolean, text, text, text, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------
-- 자가서비스 3종 - 비공개 토글 / 등록 해지 / 개인정보 제공 철회(모두 별개 개념).
-- ---------------------------------------------------------
create or replace function public.set_planner_profile_hidden(p_planner_profile_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner_of_planner_profile(p_planner_profile_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.planner_profiles set is_hidden = p_hidden, updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.set_planner_profile_hidden(uuid, boolean) to authenticated;

create or replace function public.withdraw_planner_profile(p_planner_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner_of_planner_profile(p_planner_profile_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.planner_profiles
  set withdrawn_at = now(), is_hidden = true, updated_at = now()
  where id = p_planner_profile_id and withdrawn_at is null;
end;
$$;

grant execute on function public.withdraw_planner_profile(uuid) to authenticated;

create or replace function public.revoke_planner_contact_sharing(p_planner_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner_of_planner_profile(p_planner_profile_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.planner_profiles set contact_sharing_revoked_at = now(), updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.revoke_planner_contact_sharing(uuid) to authenticated;

create or replace function public.get_my_planner_market_profile()
returns setof public.planner_profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.planner_profiles
  where user_id = public.current_member_id() and withdrawn_at is null
  limit 1;
$$;

grant execute on function public.get_my_planner_market_profile() to authenticated;

-- ---------------------------------------------------------
-- 관리자 승인/반려 - 승인돼야만 0035의 public_planner_profiles 뷰에 노출된다.
-- ---------------------------------------------------------
create or replace function public.admin_review_planner_market_profile(
  p_planner_profile_id uuid,
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
  v_profile public.planner_profiles;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_profile from public.planner_profiles where id = p_planner_profile_id;
  if v_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_profile.status <> 'pending_review' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  update public.planner_profiles
  set status = p_decision, reviewed_by_admin_id = v_admin_id, reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_planner_profile_id;
end;
$$;

grant execute on function public.admin_review_planner_market_profile(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 스토리지 버킷 - 프로필 사진은 공개(branch-images와 동일 관례), 소득증빙 서류는
-- 비공개(planner-verification-docs와 동일 관례). 서류 버킷은 0035에서 실제로
-- 쓰이지만 등록 폼과 함께 준비되도록 여기서 함께 생성한다.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('planner-market-profile-photos', 'planner-market-profile-photos', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('planner-market-income-docs', 'planner-market-income-docs', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 경로: {user_id}/{uuid}.{ext} - 본인만 업로드/삭제 가능, 공개 버킷이라 별도 select 정책 불필요.
create policy "planner market photo: insert by owner"
  on storage.objects for insert
  with check (
    bucket_id = 'planner-market-profile-photos'
    and ((storage.foldername(name))[1])::uuid = public.current_member_id()
  );

create policy "planner market photo: delete by owner"
  on storage.objects for delete
  using (
    bucket_id = 'planner-market-profile-photos'
    and ((storage.foldername(name))[1])::uuid = public.current_member_id()
  );

-- 경로: {planner_profile_id}/{uuid}.{ext}
create policy "planner market income docs: manage by owner or admin"
  on storage.objects for insert
  with check (
    bucket_id = 'planner-market-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "planner market income docs: select by owner or admin"
  on storage.objects for select
  using (
    bucket_id = 'planner-market-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "planner market income docs: delete by owner or admin"
  on storage.objects for delete
  using (
    bucket_id = 'planner-market-income-docs'
    and (
      public.current_admin_id() is not null
      or public.is_owner_of_planner_profile(((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname like '%planner_market%' or proname like '%planner_profile%';
-- select * from storage.buckets where id like 'planner-market-%';
