-- =========================================================
-- 0028_member_email_signup.sql
-- 일반회원(아이디+비밀번호+이메일인증) 가입 - 기존 구글 로그인과 완전히 별개의
-- 두 번째 회원 유형이다. 이메일 인증까지 완료해야만 회원 전용 기능(채팅/지점등록/
-- TOP설계사등록)을 쓸 수 있다.
--
-- 중요 - 이번 마이그레이션 전 발견한 위험 두 가지를 반드시 함께 처리한다:
-- 1) public.users의 기존 UPDATE 정책(auth_user_id=auth.uid())에 컬럼 제한이 없다.
--    지금까지는 아무도 update를 호출하지 않아 무해했지만, 이번에 email_verified_at/
--    ga_company_id/approval_status 컬럼이 추가되면 사용자가 브라우저에서 직접
--    자기 행을 update해 "이메일 인증 자가승인"을 할 수 있게 된다 - 그래서 authenticated의
--    update 권한 자체를 회수하고, 이후 모든 쓰기는 이 마이그레이션의 RPC로만 한다.
-- 2) src/middleware.ts가 모든 방문자에게 익명 Supabase 세션을 자동 발급한다
--    (비로그인 방문자도 auth.uid()가 non-null, role='authenticated'). 그래서 이번에
--    추가하는 is_full_member()는 auth.uid()가 있는지가 아니라 반드시 public.users까지
--    조인해서 provider='email' and email_verified_at is not null을 직접 확인한다.
--
-- 0027 적용 후 실행.
-- =========================================================

revoke update on public.users from authenticated;

alter table public.users
  add column if not exists username text,
  add column if not exists contact text,
  add column if not exists ga_company_id uuid references public.ga_company(id),
  add column if not exists email_verified_at timestamptz;

create unique index if not exists idx_users_username on public.users(username) where username is not null;

-- ---------------------------------------------------------
-- 공용 헬퍼 - 이후 GA변경요청/채팅 등 모든 신규 RLS·RPC가 이 두 함수로 통일한다.
-- ---------------------------------------------------------
create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid();
$$;

create or replace function public.is_full_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and provider = 'email'
      and email_verified_at is not null
      and approval_status = 'approved'
  );
$$;

-- ---------------------------------------------------------
-- 아이디 중복확인 - 가입 폼에서 실시간으로 호출(비로그인 상태 포함이라 anon도 허용).
-- ---------------------------------------------------------
create or replace function public.check_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.users where username = lower(trim(p_username))
  );
$$;

grant execute on function public.check_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------
-- 로그인 - 아이디로 로그인하되 Supabase Auth 자체는 이메일 기반이라, 로그인 폼이
-- 먼저 이 함수로 이메일을 알아낸 뒤 signInWithPassword를 호출한다.
-- ---------------------------------------------------------
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.users
  where username = lower(trim(p_username)) and provider = 'email';
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- ---------------------------------------------------------
-- 가입 - signUp() 직후(이메일 인증 전, 세션 없음) 호출된다. auth.uid()를 쓸 수 없으므로
-- 호출자가 넘긴 auth_user_id를 그대로 신뢰한다(auth.users의 실제 id인지만 검증).
-- ---------------------------------------------------------
create or replace function public.signup_email_member(
  p_auth_user_id uuid,
  p_username text,
  p_name text,
  p_contact text,
  p_ga_company_id uuid
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(p_username));
  v_row public.users;
begin
  if not exists (select 1 from auth.users where id = p_auth_user_id) then
    raise exception 'INVALID_AUTH_USER';
  end if;
  if exists (select 1 from public.users where auth_user_id = p_auth_user_id) then
    raise exception 'ALREADY_REGISTERED';
  end if;
  if length(v_username) < 3 then
    raise exception 'INVALID_USERNAME';
  end if;
  if length(trim(p_name)) = 0 or length(trim(p_contact)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if not exists (select 1 from public.ga_company where id = p_ga_company_id) then
    raise exception 'INVALID_GA_COMPANY';
  end if;

  insert into public.users (
    auth_user_id, email, nickname, provider, approval_status,
    username, contact, ga_company_id
  )
  select
    p_auth_user_id, u.email, trim(p_name), 'email', 'pending',
    v_username, trim(p_contact), p_ga_company_id
  from auth.users u where u.id = p_auth_user_id
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'USERNAME_TAKEN';
end;
$$;

grant execute on function public.signup_email_member(uuid, text, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- 이메일 인증 완료 처리 - /auth/callback이 세션 수립 후 호출한다(auth.uid() 사용 가능).
-- 이미 승인된 상태에서 다시 호출돼도(링크 두 번 클릭) 에러 없이 무시한다.
-- ---------------------------------------------------------
create or replace function public.confirm_email_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set approval_status = 'approved', email_verified_at = coalesce(email_verified_at, now())
  where auth_user_id = auth.uid() and provider = 'email' and approval_status = 'pending';
end;
$$;

grant execute on function public.confirm_email_signup() to authenticated;

-- ---------------------------------------------------------
-- 마이페이지 - 연락처 변경. 비밀번호 변경은 Supabase Auth의 updateUser()를 그대로 쓰므로
-- 별도 RPC가 필요 없다.
-- ---------------------------------------------------------
create or replace function public.update_my_contact(p_contact text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(p_contact)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  update public.users set contact = trim(p_contact) where auth_user_id = auth.uid();
end;
$$;

grant execute on function public.update_my_contact(text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select provider, approval_status, count(*) from public.users group by 1,2;
-- select proname from pg_proc where proname in ('current_member_id','is_full_member','check_username_available','get_email_by_username','signup_email_member','confirm_email_signup','update_my_contact');
