-- =========================================================
-- 0031_signup_confirm_time_profile.sql
-- signup_email_member()는 세션이 없는 상태(이메일 인증 전)에서 클라이언트가 넘긴
-- auth_user_id를 그대로 신뢰해 auth.users에 존재하는지 조회하는 구조였다 - 실제
-- 운영에서 이 조회가 실패해 P0001 INVALID_AUTH_USER 오류가 발생했다. 세션 없는
-- 무인증 RPC가 외부 UUID를 검증해야 하는 구조 자체가 근본 원인이다(0028 마이그레이션
-- 주석에도 "수용 가능한 잔여 위험"으로 명시했던 지점).
--
-- 프로필 생성 시점을 signUp() 직후가 아니라 "이메일 인증 완료 시점"(=/auth/callback이
-- 세션을 이미 수립한 뒤)으로 옮긴다 - 이 시점의 auth.uid()는 항상 실제 로그인 세션에서
-- 나온 값이라 auth.users 존재가 구조적으로 보장된다. signUp() 시 options.data로 넘긴
-- username/name/contact/gaCompanyId는 auth.users.raw_user_meta_data에 이미 저장되어
-- 있으므로 여기서 그대로 읽어 쓴다.
-- =========================================================

drop function if exists public.signup_email_member(uuid, text, text, text, uuid);

-- 기존 confirm_email_signup()은 returns void였다 - 반환 타입이 바뀌면 create or replace로는
-- 안 되고 먼저 drop해야 한다(42P13: cannot change return type of existing function).
drop function if exists public.confirm_email_signup();

create or replace function public.confirm_email_signup()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_meta jsonb;
  v_username text;
  v_name text;
  v_contact text;
  v_ga_company_id uuid;
  v_row public.users;
begin
  if v_auth_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 이미 프로필이 있으면(가입 완료됐거나 인증 링크를 두 번 클릭) 멱등하게 처리한다.
  select * into v_row from public.users where auth_user_id = v_auth_user_id;
  if found then
    if v_row.provider = 'email' and v_row.approval_status = 'pending' then
      update public.users
      set approval_status = 'approved', email_verified_at = coalesce(email_verified_at, now())
      where auth_user_id = v_auth_user_id
      returning * into v_row;
    end if;
    return v_row;
  end if;

  select raw_user_meta_data into v_meta from auth.users where id = v_auth_user_id;
  v_username := lower(trim(coalesce(v_meta->>'username', '')));
  v_name := trim(coalesce(v_meta->>'name', ''));
  v_contact := trim(coalesce(v_meta->>'contact', ''));
  v_ga_company_id := nullif(v_meta->>'gaCompanyId', '')::uuid;

  if length(v_username) < 3 then
    raise exception 'INVALID_USERNAME';
  end if;
  if length(v_name) = 0 or length(v_contact) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if v_ga_company_id is null or not exists (select 1 from public.ga_company where id = v_ga_company_id) then
    raise exception 'INVALID_GA_COMPANY';
  end if;

  insert into public.users (
    auth_user_id, email, nickname, provider, approval_status,
    username, contact, ga_company_id, email_verified_at
  )
  select
    v_auth_user_id, u.email, v_name, 'email', 'approved',
    v_username, v_contact, v_ga_company_id, now()
  from auth.users u where u.id = v_auth_user_id
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'USERNAME_TAKEN';
end;
$$;

grant execute on function public.confirm_email_signup() to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'signup_email_member'; -- 0행이어야 함
-- select provider, approval_status, count(*) from public.users group by 1,2;
