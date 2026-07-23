-- =========================================================
-- bootstrap_admin.sql
-- 최초 플랫폼 관리자(super_admin) 계정을 1회 생성한다.
-- 버전 관리되는 migration이 아니다 - 특정 프로젝트의 이메일 값에 의존하는
-- 환경별 1회성 시드이므로 supabase/migrations/ 밖에 둔다.
--
-- 사전 준비 (Supabase 대시보드에서 직접 수행):
--   Authentication -> Users -> Add user 로 이메일+비밀번호 계정을 생성한다.
--   이메일은 .env.local의 ADMIN_BOOTSTRAP_EMAIL 값과 동일하게 맞추는 것을 권장한다.
--
-- 실행 순서: 0006 -> 0007 -> 0008 -> 0009 -> 0010 적용 후, 위 Auth 계정 생성 후 이 파일을 실행한다.
-- =========================================================

-- 아래 'admin@example.com'을 방금 생성한 관리자 계정의 실제 이메일로 바꿔서 실행하세요.
insert into public.admin_users (
  auth_user_id, email, display_name, role,
  can_adjust_metrics, can_override_best, can_edit_author_name, can_change_created_at, can_pin_posts,
  is_active
)
select
  id, email, '관리자', 'super_admin',
  true, true, true, true, true,
  true
from auth.users
where email = 'admin@example.com'
on conflict (auth_user_id) do update set is_active = true, role = 'super_admin';

-- 확인: 아래 결과에 방금 만든 계정이 role='super_admin', is_active=true로 보이면 성공입니다.
select id, auth_user_id, email, display_name, role, is_active from public.admin_users;
