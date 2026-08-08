-- =========================================================
-- 0077_kakao_gated_signup.sql
-- 오너 지시(2026-08-08): 회원가입은 이제 "카카오톡 인증을 통과해야만" 기존 회원가입
-- 폼(이름/이메일/연락처/소속GA)이 뜬다. 카카오 인증이 이메일 인증을 대체한다 -
-- 이메일 왕복(가입→메일함→링크클릭)이 없어진다.
--
-- confirm_email_signup()(0031)과 완전히 동일한 패턴이다 - 실제 로그인 세션이 이미
-- 있는 시점(auth.uid()가 카카오 OAuth로 보장됨)에만 프로필을 만든다. 차이는 딱 하나:
-- kakao_verified_contact를 카카오가 주는 값이 아니라 "이 폼에서 사용자가 직접 입력한
-- 연락처"로 채운다 - 카카오는 지금 이메일/연락처를 못 준다(비즈앱 전환 전)는 사실과
-- 무관하게 정회원 판정이 성립해야 하기 때문이다.
--
-- is_full_member()(0061)는 건드리지 않는다 - "(provider='kakao' and
-- kakao_verified_contact is not null)" 조건이 이미 이 설계를 그대로 지원한다.
-- 보안 함수는 최소한으로 건드린다(CTO 지시).
-- =========================================================

create or replace function public.complete_kakao_signup(
  p_username text,
  p_name text,
  p_email text,
  p_contact text,
  p_ga_company_id uuid
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_provider text;
  v_username text;
  v_name text;
  v_email text;
  v_contact text;
  v_row public.users;
begin
  if v_auth_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select raw_app_meta_data->>'provider' into v_provider from auth.users where id = v_auth_user_id;
  if v_provider <> 'kakao' then
    raise exception 'NOT_KAKAO_SESSION';
  end if;

  -- 이미 프로필이 있으면(재가입 시도 = 사실상 로그인) 멱등하게 기존 행을 그대로
  -- 반환한다 - 새 폼 제출값으로 덮어쓰지 않는다(오너 지시 4번: 재시도는 로그인 처리).
  select * into v_row from public.users where auth_user_id = v_auth_user_id;
  if found then
    return v_row;
  end if;

  v_username := lower(trim(coalesce(p_username, '')));
  v_name := trim(coalesce(p_name, ''));
  v_email := trim(coalesce(p_email, ''));
  v_contact := trim(coalesce(p_contact, ''));

  if length(v_username) < 3 then
    raise exception 'INVALID_USERNAME';
  end if;
  if length(v_name) = 0 or length(v_email) = 0 or length(v_contact) = 0 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_ga_company_id is null or not exists (select 1 from public.ga_company where id = p_ga_company_id) then
    raise exception 'INVALID_GA_COMPANY';
  end if;

  insert into public.users (
    auth_user_id, email, nickname, provider, approval_status,
    username, contact, ga_company_id, kakao_verified_contact
  )
  values (
    v_auth_user_id, v_email, v_name, 'kakao', 'approved',
    v_username, v_contact, p_ga_company_id, v_contact
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'USERNAME_TAKEN';
end;
$$;

grant execute on function public.complete_kakao_signup(text, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'complete_kakao_signup';
-- select provider, count(*), count(kakao_verified_contact) from public.users group by 1;
