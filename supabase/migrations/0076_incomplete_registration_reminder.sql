-- =========================================================
-- 0076_incomplete_registration_reminder.sql (W-087④, P0)
-- status='incomplete'(0075)로 저장된 등록이 방치될 때 한 번만 리마인드 푸시를
-- 보내기 위한 추적 컬럼. 매일 도는 크론(morning-branch-notifications)이
-- "N일 이상 방치 + 아직 리마인드 안 보냄" 건만 골라 보내고 이 컬럼을 채운다 -
-- 컬럼이 없으면 크론이 매일 같은 사람에게 반복 발송하게 된다(오너가 여러 번
-- 지적한 "조용한 시간대/개인정보 금지"와 별개로, 발송 자체가 매일 반복되면 그것도
-- 스팸이다).
-- 0075 적용 후 실행.
-- =========================================================

alter table public.branch_registrations
  add column if not exists incomplete_reminder_sent_at timestamptz;

create index if not exists idx_branch_registrations_incomplete_pending
  on public.branch_registrations (updated_at)
  where status = 'incomplete' and incomplete_reminder_sent_at is null;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name from information_schema.columns
--   where table_name = 'branch_registrations' and column_name = 'incomplete_reminder_sent_at';
