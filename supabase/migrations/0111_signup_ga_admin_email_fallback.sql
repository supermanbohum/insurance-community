-- =========================================================
-- 0111_signup_ga_admin_email_fallback.sql
-- signup_ga_admin: 카카오 회원의 이메일 폴백 + 자리표시자 금지
--
-- 🔴🔴🔴 **이미 운영에 적용돼 있다. 다시 실행하지 마라.** 🔴🔴🔴
--   적용: 2026-08-13 17시경, 오너가 Supabase SQL 편집기에서 직접 실행
--   대조: CTO가 `pg_get_functiondef`로 아래 정의와 일치함을 확인
--   이 파일은 **운영 선적용 / 저장소 후행 기록**이다. 코드는 이미 살아 있고
--   저장소에 번호 자리를 뒤늦게 박는 것이 목적이다.
--
-- ---------------------------------------------------------
-- 왜 번호가 0111인가
-- ---------------------------------------------------------
-- 이 SQL이 0111 자리를 **먼저** 차지했다(운영 17시 적용). 그런데 같은 날 저녁에
-- 만든 planner 심사 마이그레이션이 저장소에서 같은 0111을 가져가 충돌했다.
-- planner 쪽을 0112로 밀고 이 파일을 원래 자리에 넣는다.
--
-- 🔴 `supabase_migrations.schema_migrations`의 최신 기록은 **0084**다. 0085 이후는
-- SQL 편집기 직접 실행이라 그 테이블에 없다. 즉 **저장소 파일 번호가 적용 순서의
-- 유일한 기록**이다. 앞으로 운영에 먼저 적용하는 건은 **번호를 저장소에 먼저 박아라**
-- (내용이 비어 있어도 자리부터 잡는다). 오늘 그 규칙이 없어서 번호가 겹쳤다.
--
-- ---------------------------------------------------------
-- 무엇을 고쳤나
-- ---------------------------------------------------------
-- 카카오 로그인은 이메일이 **선택 동의**라 `auth.users.email`이 NULL일 수 있다.
-- 그 상태로 GA 관리자 가입을 하면 이메일 칸이 비어 통지 경로가 끊긴다.
--   ⓐ `auth.users.email`이 비면 **우리 가입 폼에서 받은 값**(`public.users.email`)으로 채운다.
--   ⓑ 그래도 없으면 **자리표시자를 만들지 않고 예외(`EMAIL_REQUIRED`)를 던진다.**
--      가짜 주소가 쌓이면 나중에 통지 경로에서 사고 난다.
--
-- ⚠️ `public.users` 조인 키는 `auth_user_id`다. `users.id`는 익명 세션의 auth uid라
-- `auth.users.id = users.id`로 조인하면 **에러 없이 그럴듯하게 틀린 결과**가 나온다.
-- 근거: src/lib/auth/session.supabase.ts → .eq('auth_user_id', authUser.id)
-- =========================================================

create or replace function public.signup_ga_admin(p_display_name text default null::text)
returns ga_admin_users
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
  v_row public.ga_admin_users;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from public.ga_admin_users where auth_user_id = auth.uid();
  if v_row.id is not null then
    return v_row;
  end if;

  select nullif(btrim(email), '') into v_email from auth.users where id = auth.uid();

  -- 🔴 카카오 이메일은 선택 동의라 여기가 NULL일 수 있다. 우리 가입 폼에서 받은 값으로 채운다.
  if v_email is null then
    select nullif(btrim(email), '') into v_email
      from public.users where auth_user_id = auth.uid();
  end if;

  -- 자리표시자 이메일을 만들지 않는다. 가짜 주소가 쌓이면 통지 경로에서 사고 난다.
  if v_email is null then
    raise exception 'EMAIL_REQUIRED';
  end if;

  insert into public.ga_admin_users (auth_user_id, ga_company_id, branch_id, email, display_name, is_active)
  values (auth.uid(), null, null, v_email, coalesce(nullif(trim(p_display_name), ''), 'GA 관리자'), true)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행해도 안전한 조회용 - 위 함수 본문은 실행하지 마라)
-- ---------------------------------------------------------
-- select pg_get_functiondef(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'signup_ga_admin';
