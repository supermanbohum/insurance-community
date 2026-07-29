-- =========================================================
-- 0022_branch_registrations.sql
-- 지점 등록/수정을 실제 관리자 승인 큐를 거치도록 바꾼다.
--
-- 배경: 지금까지 신규 지점 등록(register_branch_for_partner)은 즉시 ga_branch를
-- 만들고, 파트너의 지점 수정(update_partner_branch)은 즉시 반영되어 왔다.
-- /admin/change-requests 화면은 존재하지만 mockStore(인메모리)만 사용하는
-- 가짜 기능이라 실제로는 아무 승인 절차가 없었다.
--
-- 이번 개편으로:
--   1) 신규 등록에 등록자 정보(성함/직책/연락처/회사소속/본부-지점명)와
--      필수 서류(임대차계약서/명함)를 추가해 허위/중복 등록을 막는다.
--   2) 신뢰도에 영향을 주는 항목(이름/주소/지역/소개글/설계사수/편의시설/사진)의
--      수정은 관리자 승인 후에만 반영된다. 연락처/취급보험사/채용공고/SNS링크는
--      기존처럼 즉시 반영을 유지한다(파트너 불편 최소화 - 사용자 확인 완료).
--
-- 신규 지점은 branch row를 즉시 만들되(기존 FK/RLS/미디어 업로드 파이프라인을
-- 그대로 재사용하기 위해) registration_status='pending', status='hidden'으로
-- 강제해 승인 전까지 공개되지 않게 한다. 기존 행은 전부 registration_status
-- 기본값 'approved'라 이번 마이그레이션이 기존 공개 노출에 전혀 영향을 주지 않는다.
--
-- 0021 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. ga_branch 확장
-- ---------------------------------------------------------
alter table public.ga_branch
  add column if not exists registration_status text not null default 'approved'
    check (registration_status in ('pending', 'approved', 'rejected'));

alter table public.ga_branch
  add column if not exists status_reason text
    check (status_reason in ('content_review', 'payment_suspended', 'manual'));
-- status_reason: status='hidden'이 된 원인을 구분해, 결제 미납으로 인한 자동
-- 비공개 처리(향후 0025)가 관리자가 별도 사유로 수동 비공개한 지점을 실수로
-- 복구시키지 않도록 한다. 지금 단계에서는 값만 마련해두고 실제로 채우는 로직은
-- 이번 마이그레이션의 review_branch_registration(content_review)부터 시작한다.

create index if not exists idx_ga_branch_registration_status on public.ga_branch(registration_status);

-- ---------------------------------------------------------
-- B. branch_registrations - 실제 승인 큐 (mock change-request 대체)
-- ---------------------------------------------------------
create table if not exists public.branch_registrations (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('create', 'update')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  branch_id uuid references public.ga_branch(id) on delete cascade,
  ga_company_id uuid references public.ga_company(id),
  submitted_by_ga_admin_id uuid not null references public.ga_admin_users(id),

  -- 등록자 정보 (신규/수정 공통 필수 - 허위등록 방지, 관리자 승인 참고자료)
  registrant_name text not null,
  registrant_title text not null,
  registrant_phone text not null,
  registrant_company text not null,
  registrant_branch_label text not null,

  -- 신규 등록(create)에만 필수. update 요청은 null.
  lease_contract_path text,
  business_card_path text,

  -- 신뢰도 항목 신규값 스냅샷. create는 참고용(실값은 ga_branch에 이미 있음),
  -- update는 이 값이 승인 시 그대로 ga_branch에 반영되는 실제 소스.
  payload jsonb not null default '{}'::jsonb,

  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,
  review_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branch_registrations_status on public.branch_registrations(status);
create index if not exists idx_branch_registrations_ga_company on public.branch_registrations(ga_company_id);
create index if not exists idx_branch_registrations_branch on public.branch_registrations(branch_id);

-- 승인 대기 중인 수정 요청이 새로 올린 사진은 이 값이 set되어 공개 조회(0007 RLS)에서
-- 자동으로 제외된다 - 별도 스테이징 버킷 없이 기존 branch_media/RLS를 그대로 재사용.
-- 승인/반려 시 review_branch_registration이 null로 되돌린다(반려는 사진 자체를 지우지
-- 않고 다음 재제출 때 다시 쓸 수 있게 pending 상태로 남겨둔다).
alter table public.branch_media
  add column if not exists pending_registration_id uuid references public.branch_registrations(id) on delete set null;

create index if not exists idx_branch_media_pending_registration on public.branch_media(pending_registration_id)
  where pending_registration_id is not null;

-- 0007의 공개 조회 정책을 pending_registration_id is null 조건까지 포함하도록 재정의.
-- (기존 정책은 이 컬럼이 생기기 전에 만들어졌으므로 그대로 두면 승인 대기 사진이
-- 공개 상세페이지에 그대로 노출된다.)
drop policy if exists "public read media of visible branch" on public.branch_media;
create policy "public read media of visible branch"
  on public.branch_media for select
  using (
    pending_registration_id is null
    and exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_media.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );

do $$
begin
  drop trigger if exists trg_set_updated_at on public.branch_registrations;
  create trigger trg_set_updated_at before update on public.branch_registrations
    for each row execute function public.set_updated_at();
end $$;

alter table public.branch_registrations enable row level security;

-- 전화번호 등 민감정보를 포함하므로 공개 정책 없음. GA 관리자는 본인이 제출한 것만.
create policy "ga admin read own registrations"
  on public.branch_registrations for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true and ga.id = branch_registrations.submitted_by_ga_admin_id
    )
  );
-- 관리자 조회는 admin_users와 동일하게 서비스롤(createAdminClient)로 접근 - 별도 정책 불필요.
-- INSERT/UPDATE는 아래 함수로만 수행(정책 없음 = 기본 차단).

-- ---------------------------------------------------------
-- C. 신규 등록 제출 - ga_branch를 즉시 생성하되 비공개 상태로 강제.
--    register_branch_for_partner(0016)의 로직을 그대로 흡수하되, 상태를
--    항상 registration_status='pending', status='hidden'으로 강제한다는 점만 다르다
--    (기존에는 신규 GA면 즉시 visible이었지만, 이제는 신규 지점은 항상 검수 대상).
-- ---------------------------------------------------------
create or replace function public.submit_branch_registration(
  p_ga_name text,
  p_branch_slug text,
  p_branch_name text,
  p_region_id uuid,
  p_manager_name text,
  p_address text,
  p_address_detail text,
  p_registrant_name text,
  p_registrant_title text,
  p_registrant_phone text,
  p_registrant_company text,
  p_registrant_branch_label text,
  p_intro_text text default null,
  p_planner_count int default null,
  p_parking_available boolean default null,
  p_visit_consult_available boolean default null,
  p_business_hours text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_tagline text default null,
  p_new_recruit_training boolean default null,
  p_experienced_hire boolean default null,
  p_db_support boolean default null,
  p_settlement_support boolean default null
)
returns table (registration_id uuid, ga_company_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_company public.ga_company;
  v_company_id uuid;
  v_is_new_company boolean := false;
  v_ga_name text;
  v_slug_base text;
  v_slug text;
  v_suffix int := 0;
  v_branch_id uuid;
  v_registration_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if v_admin.ga_company_id is not null then
    raise exception 'ALREADY_HAS_COMPANY';
  end if;

  v_ga_name := trim(p_ga_name);
  if v_ga_name = '' or length(trim(p_branch_name)) = 0 or length(trim(p_address)) = 0
     or length(trim(p_branch_slug)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if length(trim(p_registrant_name)) = 0 or length(trim(p_registrant_title)) = 0
     or length(trim(p_registrant_phone)) = 0 or length(trim(p_registrant_company)) = 0
     or length(trim(p_registrant_branch_label)) = 0 then
    raise exception 'MISSING_REGISTRANT_INFO';
  end if;

  select * into v_company from public.ga_company where name = v_ga_name;

  if v_company.id is not null then
    v_company_id := v_company.id;
  else
    v_is_new_company := true;
    v_slug_base := trim(both '-' from regexp_replace(lower(v_ga_name), '[^a-z0-9가-힣]+', '-', 'g'));
    if v_slug_base = '' then
      v_slug_base := 'ga';
    end if;
    v_slug := v_slug_base;
    while exists (select 1 from public.ga_company where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_slug_base || '-' || v_suffix;
    end loop;

    insert into public.ga_company (slug, name)
    values (v_slug, v_ga_name)
    returning id into v_company_id;
  end if;

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, status, registration_status, status_reason, lat, lng,
    tagline, new_recruit_training, experienced_hire, db_support, settlement_support
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', v_is_new_company, 'hidden', 'pending', 'content_review', p_lat, p_lng,
    nullif(trim(coalesce(p_tagline, '')), ''), p_new_recruit_training, p_experienced_hire, p_db_support, p_settlement_support
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  insert into public.branch_registrations (
    request_type, branch_id, ga_company_id, submitted_by_ga_admin_id,
    registrant_name, registrant_title, registrant_phone, registrant_company, registrant_branch_label,
    payload
  ) values (
    'create', v_branch_id, v_company_id, v_admin.id,
    trim(p_registrant_name), trim(p_registrant_title), trim(p_registrant_phone), trim(p_registrant_company), trim(p_registrant_branch_label),
    jsonb_build_object('branchName', p_branch_name, 'gaName', v_ga_name)
  ) returning id into v_registration_id;

  return query select v_registration_id, v_company_id, v_branch_id;
end;
$$;

grant execute on function public.submit_branch_registration(
  text, text, text, uuid, text, text, text, text, text, text, text, text,
  text, int, boolean, boolean, text, double precision, double precision,
  text, boolean, boolean, boolean, boolean
) to authenticated;

-- ---------------------------------------------------------
-- D. 신규 등록 서류(임대차계약서/명함) 첨부 - branch가 이미 만들어진 뒤
--    업로드 액션이 스토리지 업로드 완료 후 경로만 등록한다(기존 add_branch_media와
--    동일한 "먼저 행 생성, 나중에 파일 첨부" 순서).
-- ---------------------------------------------------------
create or replace function public.attach_registration_document(
  p_registration_id uuid,
  p_doc_type text,
  p_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.branch_registrations;
begin
  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if not exists (
    select 1 from public.ga_admin_users ga
    where ga.auth_user_id = auth.uid() and ga.is_active = true and ga.id = v_reg.submitted_by_ga_admin_id
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_reg.status <> 'pending' then
    raise exception 'REGISTRATION_ALREADY_REVIEWED';
  end if;
  if length(trim(p_path)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_doc_type = 'lease_contract' then
    update public.branch_registrations set lease_contract_path = p_path, updated_at = now() where id = p_registration_id;
  elsif p_doc_type = 'business_card' then
    update public.branch_registrations set business_card_path = p_path, updated_at = now() where id = p_registration_id;
  else
    raise exception 'INVALID_DOC_TYPE';
  end if;
end;
$$;

grant execute on function public.attach_registration_document(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- E. 지점 수정 - 신뢰도 항목은 큐에만 적재(즉시 반영 안 함). 연락처/보험사/
--    채용공고/SNS링크는 이 함수를 거치지 않고 기존 RPC를 그대로 계속 사용한다.
-- ---------------------------------------------------------
create or replace function public.submit_branch_update(
  p_branch_id uuid,
  p_registrant_name text,
  p_registrant_title text,
  p_registrant_phone text,
  p_registrant_company text,
  p_registrant_branch_label text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_registration_id uuid;
begin
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
  end if;
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;

  if length(trim(p_registrant_name)) = 0 or length(trim(p_registrant_title)) = 0
     or length(trim(p_registrant_phone)) = 0 or length(trim(p_registrant_company)) = 0
     or length(trim(p_registrant_branch_label)) = 0 then
    raise exception 'MISSING_REGISTRANT_INFO';
  end if;
  if p_payload is null or p_payload = '{}'::jsonb then
    raise exception 'EMPTY_PAYLOAD';
  end if;

  insert into public.branch_registrations (
    request_type, branch_id, ga_company_id, submitted_by_ga_admin_id,
    registrant_name, registrant_title, registrant_phone, registrant_company, registrant_branch_label,
    payload
  ) values (
    'update', p_branch_id, v_admin.ga_company_id, v_admin.id,
    trim(p_registrant_name), trim(p_registrant_title), trim(p_registrant_phone), trim(p_registrant_company), trim(p_registrant_branch_label),
    p_payload
  ) returning id into v_registration_id;

  return v_registration_id;
end;
$$;

grant execute on function public.submit_branch_update(uuid, text, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- F. 관리자 승인/반려
-- ---------------------------------------------------------
create or replace function public.review_branch_registration(
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
  v_reg public.branch_registrations;
  v_company public.ga_company;
  v_payload jsonb;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if v_reg.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  if p_decision = 'approved' and v_reg.request_type = 'create' then
    if v_reg.lease_contract_path is null or v_reg.business_card_path is null then
      raise exception 'MISSING_REQUIRED_DOCUMENTS';
    end if;
    if not exists (select 1 from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_main') then
      raise exception 'MISSING_MAIN_PHOTO';
    end if;
    if (select count(*) from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_office') < 3 then
      raise exception 'MISSING_OFFICE_PHOTOS';
    end if;

    select * into v_company from public.ga_company where id = v_reg.ga_company_id;
    update public.ga_branch
    set registration_status = 'approved',
        status = case when v_company.approval_status = 'approved' then 'visible' else 'hidden' end,
        status_reason = null
    where id = v_reg.branch_id;

  elsif p_decision = 'approved' and v_reg.request_type = 'update' then
    v_payload := v_reg.payload;
    update public.ga_branch set
      name = coalesce(v_payload->>'name', name),
      region_id = case when v_payload ? 'regionId' then (v_payload->>'regionId')::uuid else region_id end,
      address = coalesce(v_payload->>'address', address),
      address_detail = coalesce(v_payload->>'addressDetail', address_detail),
      intro_text = coalesce(v_payload->>'introText', intro_text),
      education_info = coalesce(v_payload->>'educationInfo', education_info),
      welfare_info = coalesce(v_payload->>'welfareInfo', welfare_info),
      db_support_info = coalesce(v_payload->>'dbSupportInfo', db_support_info),
      settlement_support_info = coalesce(v_payload->>'settlementSupportInfo', settlement_support_info),
      planner_count = case when v_payload ? 'plannerCount' then (v_payload->>'plannerCount')::int else planner_count end,
      parking_available = case when v_payload ? 'parkingAvailable' then (v_payload->>'parkingAvailable')::boolean else parking_available end,
      visit_consult_available = case when v_payload ? 'visitConsultAvailable' then (v_payload->>'visitConsultAvailable')::boolean else visit_consult_available end,
      business_hours = coalesce(v_payload->>'businessHours', business_hours),
      tagline = coalesce(v_payload->>'tagline', tagline),
      new_recruit_training = case when v_payload ? 'newRecruitTraining' then (v_payload->>'newRecruitTraining')::boolean else new_recruit_training end,
      experienced_hire = case when v_payload ? 'experiencedHire' then (v_payload->>'experiencedHire')::boolean else experienced_hire end,
      db_support = case when v_payload ? 'dbSupport' then (v_payload->>'dbSupport')::boolean else db_support end,
      settlement_support = case when v_payload ? 'settlementSupport' then (v_payload->>'settlementSupport')::boolean else settlement_support end
    where id = v_reg.branch_id;

    update public.branch_media set pending_registration_id = null
    where pending_registration_id = p_registration_id;
  end if;

  update public.branch_registrations
  set status = p_decision, reviewed_by_admin_id = public.current_admin_id(), reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_registration_id;

  if p_decision = 'rejected' then
    -- 반려된 신규 등록 사진은 다음 재제출에서 다시 채워야 하므로 스테이징 상태 그대로 둔다
    -- (지점 자체가 비공개 상태이므로 노출 위험 없음).
    null;
  end if;
end;
$$;

grant execute on function public.review_branch_registration(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- G. 파트너 본인 제출 이력 조회 (/partner/history 실데이터 전환용)
-- ---------------------------------------------------------
create or replace function public.list_my_branch_registrations()
returns setof public.branch_registrations
language sql
stable
security definer
set search_path = public
as $$
  select r.* from public.branch_registrations r
  join public.ga_admin_users ga on ga.id = r.submitted_by_ga_admin_id
  where ga.auth_user_id = auth.uid() and ga.is_active = true
  order by r.created_at desc;
$$;

grant execute on function public.list_my_branch_registrations() to authenticated;

-- ---------------------------------------------------------
-- H. 비공개 서류 스토리지 버킷
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branch-verification-docs', 'branch-verification-docs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 경로: {branch_id}/{registration_id}/{lease|card}.{ext}. 업로드/삭제는 해당 지점의
-- GA 관리자 또는 플랫폼 관리자만. 조회(SELECT)도 버킷이 비공개이므로 동일하게 제한
-- (서명된 URL 발급 시점에 관리자 클라이언트를 쓰므로 이 정책은 방어선 역할).
create policy "verification docs: manage by platform or ga admin"
  on storage.objects for insert
  with check (
    bucket_id = 'branch-verification-docs'
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "verification docs: select by platform or ga admin"
  on storage.objects for select
  using (
    bucket_id = 'branch-verification-docs'
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "verification docs: delete by platform or ga admin"
  on storage.objects for delete
  using (
    bucket_id = 'branch-verification-docs'
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 직접 검증)
-- ---------------------------------------------------------
-- select registration_status, status, count(*) from public.ga_branch group by 1,2;
-- (기존 행은 전부 registration_status='approved'여야 정상 - 이번 마이그레이션이 기존 노출에 영향 없음)
-- select proname from pg_proc where proname in ('submit_branch_registration','attach_registration_document','submit_branch_update','review_branch_registration','list_my_branch_registrations');
