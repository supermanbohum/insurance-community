-- =========================================================
-- 0060_legacy_top_planner_badge_relabel.sql
-- 설계사마켓 배지 카탈로그의 'top_planner'(⭐) 배지는 0038/0049 주석에 "사용자가
-- 예시로 든 배지 라벨일 뿐인 플레이스홀더"로 명시돼 있었다. 새로 만든
-- top_designer_* 인증 시스템과 이름이 겹치므로 혼동을 막기 위해 Legacy로
-- 표시하고 신규 발급을 중단한다 - 기존에 이미 부여된 배지(planner_badges 행)는
-- 그대로 유지되며, 0038/0049 파일 자체는 수정하지 않는다(데이터만 갱신).
--
-- 부작용: admin_grant_planner_badge(0038)는 is_active=true인 badge_type만
-- 허용하므로, 이 마이그레이션 이후 'top_planner' 배지의 신규 부여는
-- INVALID_BADGE_TYPE으로 막힌다 - 의도된 동작이다.
-- =========================================================

update public.planner_badge_types
set
  label = 'TOP 설계사 (Legacy)',
  is_active = false,
  description = coalesce(description, '') || ' (신규 발급이 중단되었습니다. 기존에 부여된 배지는 그대로 유지됩니다.)'
where code = 'top_planner';
