-- =========================================================
-- 0024_planner_certifications.sql
-- 고소득 설계사(우수설계사) 인증 시스템.
--
-- 등록 조건: 본인이 관리하는 지점의 registration_status가 'approved'여야 한다
-- (지점등록 승인 → 고소득 설계사 등록 순서, 0022 참고). 대표/총괄/사업단장/
-- 본부장/지점장/임원 등 관리자 직책은 등록 대상에서 제외한다.
--
-- 공개 노출은 배지(등급+인원수)뿐이다 - 실명/연락처/원천징수영수증/실제 연봉은
-- 어떤 공개 API에도 절대 포함하지 않는다(get_branch_planner_badge_summary만
-- anon/authenticated에 공개, 나머지 함수/테이블은 관리자+본인만).
--
-- 인증 유효기간은 1년이며 만료 여부는 저장하지 않고 조회 시점에 expires_at으로
-- 계산한다(pg_cron 등 배치 없이 동작). 재인증마다 이력이 누적된다.
--
-- 0023 적용 후 실행.
-- =========================================================

create table if not exists public.planner_certifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  submitted_by_ga_admin_id uuid not null references public.ga_admin_users(id),

  planner_name text not null,
  planner_phone text not null,
  planner_company text not null,
  job_title text not null,
  income_tier text not null check (income_tier in ('tier_1', 'tier_2', 'tier_3')), -- 1억+/2억+/3억+

  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'pending_renewal')),

  approved_at timestamptz,   -- 최초 인증일 - 이후 갱신에도 값이 바뀌지 않는다
  expires_at timestamptz,    -- 현재 인증 주기 만료일 (approve/renew 승인 시 now()+1년으로 갱신)
  approved_by_admin_id uuid references public.admin_users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planner_cert_branch on public.planner_certifications(branch_id);
create index if not exists idx_planner_cert_status on public.planner_certifications(status);
create index if not exists idx_planner_cert_expires on public.planner_certifications(expires_at);

do $$
begin
  drop trigger if exists trg_set_updated_at on public.planner_certifications;
  create trigger trg_set_updated_at before update on public.planner_certifications
    for each row execute function public.set_updated_at();
end $$;

-- 승인/재인증 이력 - 12번 요구사항(최초인증일/마지막재인증일/만료일/승인관리자/메모,
-- 여러 재인증 주기 누적) 충족. 매 승인마다 한 행씩 추가되고 절대 덮어쓰지 않는다.
create table if not exists public.planner_certification_history (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.planner_certifications(id) on delete cascade,
  event_type text not null check (event_type in ('initial_approval', 'renewal_approval', 'rejection')),
  income_tier text not null,
  approved_by_admin_id uuid references public.admin_users(id),
  approval_memo text,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_planner_cert_history_cert on public.planner_certification_history(certification_id);

-- 원천징수영수증 - 갱신마다 새 서류가 쌓이므로(branch_registrations의 1회성
-- 서류와 달리 다형 구조가 적합) 별도 테이블로 둔다. owner_type은 지금은
-- planner_certification 하나뿐이지만, 향후 다른 인증 유형이 생겨도 같은
-- 테이블을 재사용할 수 있게 열어둔다.
create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('planner_certification')),
  owner_id uuid not null,
  doc_type text not null check (doc_type in ('withholding_tax_certificate')),
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_verification_documents_owner on public.verification_documents(owner_type, owner_id);

-- ---------------------------------------------------------
-- RLS - planner_certifications/history/verification_documents는 민감정보라
-- 공개 정책이 전혀 없다. GA 관리자는 본인 지점 것만, 관리자는 서비스롤로.
-- ---------------------------------------------------------
alter table public.planner_certifications enable row level security;
alter table public.planner_certification_history enable row level security;
alter table public.verification_documents enable row level security;

create policy "ga admin read own branch planner certifications"
  on public.planner_certifications for select
  using (public.is_ga_admin_for_branch(branch_id));

create policy "ga admin read own certification history"
  on public.planner_certification_history for select
  using (
    exists (
      select 1 from public.planner_certifications pc
      where pc.id = planner_certification_history.certification_id
        and public.is_ga_admin_for_branch(pc.branch_id)
    )
  );

create policy "ga admin read own certification documents"
  on public.verification_documents for select
  using (
    owner_type = 'planner_certification'
    and exists (
      select 1 from public.planner_certifications pc
      where pc.id = verification_documents.owner_id
        and public.is_ga_admin_for_branch(pc.branch_id)
    )
  );

-- ---------------------------------------------------------
-- 차단 직책 체크 헬퍼 - 관리자/경영진 직책은 "고소득 설계사"(개인 생산자) 대상이 아니다.
-- ---------------------------------------------------------
create or replace function public.is_blocked_planner_title(p_job_title text)
returns boolean
language sql
immutable
as $$
  select regexp_replace(trim(p_job_title), '\s+', '', 'g') ~* '(대표|총괄|사업단장|본부장|지점장|임원|이사|대표이사)';
$$;

-- ---------------------------------------------------------
-- 등록 - 선행조건(지점 등록 승인 완료), 차단 직책 검증.
-- ---------------------------------------------------------
create or replace function public.submit_planner_certification(
  p_branch_id uuid,
  p_planner_name text,
  p_planner_phone text,
  p_planner_company text,
  p_job_title text,
  p_income_tier text,
  p_withholding_doc_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_branch public.ga_branch;
  v_certification_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  select * into v_branch from public.ga_branch where id = p_branch_id;
  if v_branch.registration_status <> 'approved' then
    raise exception 'BRANCH_NOT_APPROVED';
  end if;

  if length(trim(p_planner_name)) = 0 or length(trim(p_planner_phone)) = 0
     or length(trim(p_planner_company)) = 0 or length(trim(p_job_title)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_income_tier not in ('tier_1', 'tier_2', 'tier_3') then
    raise exception 'INVALID_INCOME_TIER';
  end if;
  if public.is_blocked_planner_title(p_job_title) then
    raise exception 'BLOCKED_JOB_TITLE';
  end if;
  if length(trim(coalesce(p_withholding_doc_path, ''))) = 0 then
    raise exception 'MISSING_WITHHOLDING_DOCUMENT';
  end if;

  insert into public.planner_certifications (
    branch_id, submitted_by_ga_admin_id, planner_name, planner_phone, planner_company, job_title, income_tier
  ) values (
    p_branch_id, v_admin.id, trim(p_planner_name), trim(p_planner_phone), trim(p_planner_company), trim(p_job_title), p_income_tier
  ) returning id into v_certification_id;

  insert into public.verification_documents (owner_type, owner_id, doc_type, storage_path)
  values ('planner_certification', v_certification_id, 'withholding_tax_certificate', p_withholding_doc_path);

  return v_certification_id;
end;
$$;

grant execute on function public.submit_planner_certification(uuid, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------
-- 갱신 신청 - 새 원천징수영수증 첨부, 만료일은 손대지 않는다(관리자 승인 시에만 연장).
-- ---------------------------------------------------------
create or replace function public.renew_planner_certification(
  p_certification_id uuid,
  p_withholding_doc_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.planner_certifications;
begin
  select * into v_cert from public.planner_certifications where id = p_certification_id;
  if v_cert.id is null then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;
  if not public.is_ga_admin_for_branch(v_cert.branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;
  if v_cert.status <> 'approved' then
    raise exception 'INVALID_STATE_FOR_RENEWAL';
  end if;
  if length(trim(coalesce(p_withholding_doc_path, ''))) = 0 then
    raise exception 'MISSING_WITHHOLDING_DOCUMENT';
  end if;

  insert into public.verification_documents (owner_type, owner_id, doc_type, storage_path)
  values ('planner_certification', p_certification_id, 'withholding_tax_certificate', p_withholding_doc_path);

  update public.planner_certifications set status = 'pending_renewal', updated_at = now() where id = p_certification_id;
end;
$$;

grant execute on function public.renew_planner_certification(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- 관리자 승인/반려 - approve 시 expires_at을 now()+1년으로 (재)설정하고 이력을 남긴다.
-- ---------------------------------------------------------
create or replace function public.review_planner_certification(
  p_certification_id uuid,
  p_decision text,
  p_memo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.planner_certifications;
  v_event_type text;
  v_admin_id uuid;
begin
  v_admin_id := public.current_admin_id();
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_cert from public.planner_certifications where id = p_certification_id;
  if v_cert.id is null then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;
  if v_cert.status not in ('pending_review', 'pending_renewal') then
    raise exception 'ALREADY_REVIEWED';
  end if;

  if p_decision = 'approved' then
    v_event_type := case when v_cert.status = 'pending_renewal' then 'renewal_approval' else 'initial_approval' end;

    update public.planner_certifications
    set status = 'approved',
        approved_at = coalesce(approved_at, now()),
        expires_at = now() + interval '1 year',
        approved_by_admin_id = v_admin_id,
        updated_at = now()
    where id = p_certification_id;

    insert into public.planner_certification_history (
      certification_id, event_type, income_tier, approved_by_admin_id, approval_memo, effective_from, effective_until
    ) values (
      p_certification_id, v_event_type, v_cert.income_tier, v_admin_id, nullif(trim(coalesce(p_memo, '')), ''),
      now(), now() + interval '1 year'
    );
  else
    update public.planner_certifications
    set status = 'rejected', approved_by_admin_id = v_admin_id, updated_at = now()
    where id = p_certification_id;

    insert into public.planner_certification_history (
      certification_id, event_type, income_tier, approved_by_admin_id, approval_memo, effective_from
    ) values (
      p_certification_id, 'rejection', v_cert.income_tier, v_admin_id, nullif(trim(coalesce(p_memo, '')), ''), now()
    );
  end if;
end;
$$;

grant execute on function public.review_planner_certification(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 공개 배지 요약 - tier/count만 반환. 이름/전화/서류 등 절대 포함하지 않는다.
-- ---------------------------------------------------------
create or replace function public.get_branch_planner_badge_summary(p_branch_id uuid)
returns table (tier text, planner_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select income_tier, count(*)
  from public.planner_certifications
  where branch_id = p_branch_id and status = 'approved' and expires_at > now()
  group by income_tier;
$$;

grant execute on function public.get_branch_planner_badge_summary(uuid) to anon, authenticated;

-- 검색/지도 필터용 - 조건에 맞는 branch_id 목록만 반환(개인정보 없음).
create or replace function public.list_branches_with_planner_certifications(p_tiers text[] default null)
returns table (branch_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct pc.branch_id
  from public.planner_certifications pc
  where pc.status = 'approved' and pc.expires_at > now()
    and (p_tiers is null or pc.income_tier = any(p_tiers));
$$;

grant execute on function public.list_branches_with_planner_certifications(text[]) to anon, authenticated;

-- ---------------------------------------------------------
-- 비공개 서류 버킷
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planner-verification-docs', 'planner-verification-docs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 경로: {branch_id}/{certification_id}/{uuid}.{ext}
create policy "planner docs: manage by platform or ga admin"
  on storage.objects for insert
  with check (
    bucket_id = 'planner-verification-docs'
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "planner docs: select by platform or ga admin"
  on storage.objects for select
  using (
    bucket_id = 'planner-verification-docs'
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "planner docs: delete by platform or ga admin"
  on storage.objects for delete
  using (
    bucket_id = 'planner-verification-docs'
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select public.is_blocked_planner_title('지점장'); -- true
-- select public.is_blocked_planner_title('보험설계사'); -- false
-- select proname from pg_proc where proname like '%planner_cert%' or proname like '%planner_badge%';
