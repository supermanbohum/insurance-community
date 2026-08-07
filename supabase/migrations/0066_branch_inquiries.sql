-- =========================================================
-- 0066_branch_inquiries.sql (W-059)
-- 비로그인 지점 문의 - 342회 조회에 문의 0건이던 전환 부재를 메운다. 로그인 요구
-- 없이 이름/연락처/경력/문의를 받아 해당 지점 관리자(ga_admin_users)와 내부
-- 관리자만 열람할 수 있게 한다. 작성자 본인도 인증 수단이 없어 조회할 수 없다.
-- =========================================================

-- ---------------------------------------------------------
-- A. 테이블 - deny-by-default RLS, 쓰기는 SECURITY DEFINER RPC 경유만 허용
-- ---------------------------------------------------------
create table if not exists public.branch_inquiries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  inquirer_name text not null,
  contact_type text not null check (contact_type in ('phone', 'kakao')),
  contact_value text not null,
  career text,
  message text not null check (char_length(message) <= 200),
  consent_collection boolean not null,
  consent_third_party boolean not null,
  consent_agreed_at timestamptz not null default now(),
  ip_address inet,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists branch_inquiries_branch_id_idx on public.branch_inquiries(branch_id);
-- 6개월 보유기간 파기 작업(추후 pg_cron 연결)이 이 인덱스로 created_at 기준 스캔한다.
create index if not exists branch_inquiries_created_at_idx on public.branch_inquiries(created_at);
create index if not exists branch_inquiries_ip_created_idx on public.branch_inquiries(ip_address, created_at);

alter table public.branch_inquiries enable row level security;
-- 정책을 하나도 만들지 않는다 - RLS가 켜진 테이블에 정책이 없으면 owner/service_role을
-- 제외한 모든 역할의 접근이 기본 거부된다(이 코드베이스 전반의 deny-by-default 관례).
revoke all on public.branch_inquiries from anon, authenticated;

-- ---------------------------------------------------------
-- B. 제출 - 비로그인 포함 누구나 호출 가능한 유일한 쓰기 경로
-- ---------------------------------------------------------
create or replace function public.submit_branch_inquiry(
  p_branch_id uuid,
  p_inquirer_name text,
  p_contact_type text,
  p_contact_value text,
  p_career text,
  p_message text,
  p_consent_collection boolean,
  p_consent_third_party boolean,
  p_ip_address inet,
  p_form_rendered_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_visible boolean;
  v_recent_count int;
  v_inquiry_id uuid;
begin
  if not p_consent_collection or not p_consent_third_party then
    raise exception 'CONSENT_REQUIRED';
  end if;

  if p_form_rendered_at is not null and now() - p_form_rendered_at < interval '3 seconds' then
    raise exception 'TOO_FAST';
  end if;

  if length(trim(coalesce(p_inquirer_name, ''))) = 0
    or length(trim(coalesce(p_contact_value, ''))) = 0
    or length(trim(coalesce(p_message, ''))) = 0
    or p_contact_type not in ('phone', 'kakao') then
    raise exception 'INVALID_INPUT';
  end if;

  if char_length(p_message) > 200 then
    raise exception 'MESSAGE_TOO_LONG';
  end if;

  -- 승인+공개 지점에만 문의를 남길 수 있다(존재하지 않거나 비공개 지점 대상 스팸 방지).
  select exists(
    select 1 from public.ga_branch b
    join public.ga_company c on c.id = b.ga_company_id
    where b.id = p_branch_id and b.status = 'visible' and b.registration_status = 'approved'
      and b.deleted_at is null and c.approval_status = 'approved' and c.deleted_at is null
  ) into v_branch_visible;

  if not v_branch_visible then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  if p_ip_address is not null then
    select count(*) into v_recent_count
    from public.branch_inquiries
    where ip_address = p_ip_address and created_at >= now() - interval '1 hour';

    if v_recent_count >= 3 then
      raise exception 'RATE_LIMITED';
    end if;
  end if;

  insert into public.branch_inquiries (
    branch_id, inquirer_name, contact_type, contact_value, career, message,
    consent_collection, consent_third_party, ip_address
  ) values (
    p_branch_id, trim(p_inquirer_name), p_contact_type, trim(p_contact_value),
    nullif(trim(coalesce(p_career, '')), ''), trim(p_message),
    p_consent_collection, p_consent_third_party, p_ip_address
  ) returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$$;

revoke all on function public.submit_branch_inquiry(uuid, text, text, text, text, text, boolean, boolean, inet, timestamptz) from public;
grant execute on function public.submit_branch_inquiry(uuid, text, text, text, text, text, boolean, boolean, inet, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------
-- C. 조회 - 해당 지점 소유 파트너(ga_admin_users) 또는 내부 관리자만
-- ---------------------------------------------------------
create or replace function public.list_my_branch_inquiries()
returns table (
  id uuid,
  branch_id uuid,
  branch_name text,
  inquirer_name text,
  contact_type text,
  contact_value text,
  career text,
  message text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select ga_company_id into v_company_id
  from public.ga_admin_users
  where auth_user_id = auth.uid() and is_active = true;

  if v_company_id is null then
    raise exception 'NOT_GA_ADMIN_WITH_COMPANY';
  end if;

  return query
  select i.id, i.branch_id, b.name, i.inquirer_name, i.contact_type, i.contact_value, i.career, i.message, i.read_at, i.created_at
  from public.branch_inquiries i
  join public.ga_branch b on b.id = i.branch_id
  where b.ga_company_id = v_company_id
  order by i.created_at desc;
end;
$$;

revoke all on function public.list_my_branch_inquiries() from public;
grant execute on function public.list_my_branch_inquiries() to authenticated;

create or replace function public.admin_list_branch_inquiries()
returns table (
  id uuid,
  branch_id uuid,
  branch_name text,
  ga_company_name text,
  inquirer_name text,
  contact_type text,
  contact_value text,
  career text,
  message text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_ADMIN';
  end if;

  return query
  select i.id, i.branch_id, b.name, c.name, i.inquirer_name, i.contact_type, i.contact_value, i.career, i.message, i.read_at, i.created_at
  from public.branch_inquiries i
  join public.ga_branch b on b.id = i.branch_id
  join public.ga_company c on c.id = b.ga_company_id
  order by i.created_at desc;
end;
$$;

revoke all on function public.admin_list_branch_inquiries() from public;
grant execute on function public.admin_list_branch_inquiries() to authenticated;

-- ---------------------------------------------------------
-- D. 읽음 처리 - 소유 파트너 또는 관리자만, 소유권 검증 후 처리
-- ---------------------------------------------------------
create or replace function public.mark_branch_inquiry_read(p_inquiry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean;
begin
  if public.current_admin_id() is not null then
    update public.branch_inquiries set read_at = coalesce(read_at, now()) where id = p_inquiry_id;
    return;
  end if;

  select exists(
    select 1
    from public.branch_inquiries i
    join public.ga_branch b on b.id = i.branch_id
    join public.ga_admin_users a on a.ga_company_id = b.ga_company_id
    where i.id = p_inquiry_id and a.auth_user_id = auth.uid() and a.is_active = true
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.branch_inquiries set read_at = coalesce(read_at, now()) where id = p_inquiry_id;
end;
$$;

revoke all on function public.mark_branch_inquiry_read(uuid) from public;
grant execute on function public.mark_branch_inquiry_read(uuid) to authenticated;
