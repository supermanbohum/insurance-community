-- ---------------------------------------------------------------------------
-- 0041: provider 컬럼 백필 + 연봉인증 배지 아이콘 통일
-- ---------------------------------------------------------------------------
-- 1) public.users.provider 백필
--    OAuth(구글/카카오) 최초 로그인 시에만 provider를 기록하고, 재로그인은
--    기존 행을 건드리지 않는다(auth/callback/route.ts). 이 로직이 배포되기
--    전에 만들어졌거나 어떤 이유로든 어긋난 기존 행이 있으면 마이페이지에
--    "Google 로그인 사용자도 이메일 로그인으로 표시"되는 증상이 나타난다.
--    Supabase Auth 자신의 기록(auth.users.raw_app_meta_data->>'provider')을
--    진실의 원천으로 삼아, 현재 'email'로 잘못 저장된 행만 정정한다.
update public.users u
set provider = au.raw_app_meta_data->>'provider'
from auth.users au
where au.id = u.auth_user_id
  and u.provider = 'email'
  and au.raw_app_meta_data->>'provider' in ('google', 'kakao');

-- 2) 설계사 마켓 "연봉 인증" 배지 아이콘을 🏆(기존 TOP설계사 전용 아이콘과 혼동)에서
--    🏅로 통일한다. TOP설계사 시스템(planner_certifications)은 이 테이블과 무관하며
--    전혀 건드리지 않는다.
update public.planner_badge_types
set icon = '🏅'
where code = 'income_verified' and icon = '🏆';

-- ---------------------------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------------------------
-- select id, email, provider from public.users where provider in ('google','kakao');
-- select code, icon from public.planner_badge_types where code = 'income_verified';
