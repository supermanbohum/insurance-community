-- =========================================================
-- 0049_planner_badge_types_expansion.sql
-- 설계사 마켓 배지 확장(WEB_MASTER_ROADMAP.md Phase 3). 0038에서 설계한 제네릭
-- 배지 시스템(planner_badge_types/planner_badges)이 이미 "새 배지 종류가 늘어도
-- DB/UI 수정이 최소화되도록" 설계되어 있어, 이번 확장은 시드 데이터 추가만으로
-- 끝난다 - 애플리케이션 코드는 전혀 변경하지 않는다.
--
-- 추가하는 4종:
--   - MDRT/COT/TOT: 국제 보험영업 실적 인증(Million/Court/Top of the Table).
--     본인이 증명서류를 첨부해 신청하고 관리자가 심사한다(연봉인증과 동일 패턴).
--   - 우수후기: 보험맵이 우수 후기를 근거로 수여하는 배지. top_planner와 동일하게
--     서류 없이 관리자가 직접 부여한다.
--
-- 0038 적용 후 실행.
-- =========================================================

insert into public.planner_badge_types (code, label, icon, description, requires_document, self_applicable, sort_order) values
  ('mdrt', 'MDRT', '🎖️', 'MDRT(Million Dollar Round Table) 인증 설계사입니다. 증빙 서류 심사를 통과했습니다.', true, true, 40),
  ('cot', 'COT', '🥇', 'COT(Court of the Table) 인증 설계사입니다. MDRT 상위 등급으로, 증빙 서류 심사를 통과했습니다.', true, true, 50),
  ('tot', 'TOT', '👑', 'TOT(Top of the Table) 인증 설계사입니다. MDRT 최상위 등급으로, 증빙 서류 심사를 통과했습니다.', true, true, 60),
  ('excellent_review', '우수후기', '💬', '보험맵이 우수한 상담 후기를 근거로 수여하는 배지입니다.', false, false, 70)
on conflict (code) do nothing;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select code, label, icon, sort_order from public.planner_badge_types order by sort_order;
