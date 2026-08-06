-- =========================================================
-- 0055_find_id_username_lookup.sql
-- "아이디 찾기" 지원 - 클라이언트가 이메일 OTP(supabase.auth.signInWithOtp →
-- verifyOtp)로 이메일 소유를 먼저 증명해 실제 세션을 얻은 뒤에만 이 RPC로
-- 자신의 아이디를 조회할 수 있다. current_member_id()와 동일하게
-- auth_user_id = auth.uid()로 본인 행만 찾는다(0028 패턴).
-- =========================================================

create or replace function public.get_username_by_verified_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select username from public.users
  where auth_user_id = auth.uid() and provider = 'email';
$$;

grant execute on function public.get_username_by_verified_email() to authenticated;
