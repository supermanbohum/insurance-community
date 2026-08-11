-- =========================================================
-- 0104_kakao_webhook_ignored_outcome.sql
-- 카카오 웹훅 수신 로그에 'ignored' 결과를 추가한다.
--
-- 배경: 0103을 만들 때 「계정 상태 변경 웹훅」을 하나의 사건으로 알고 설계했는데,
-- 실제로는 17종 이벤트 묶음이었다. 그중 우리가 탈퇴로 처리하는 것은
-- user-unlinked(앱 연결 해제)와 account-purged(계정 탈퇴) 둘뿐이고, 나머지
-- (user-linked·user-scope-consent 등)는 처리하지 않고 기록만 남긴다.
--
-- 🔴 처리 안 한 것을 'no_match'로 떨어뜨리면 안 된다. no_match는 "카카오가 알려준
-- 사용자가 우리 DB에 없었다"는 뜻이라, 섞이면 로그를 봐도 무엇이 왔는지 구분할 수
-- 없다. 나중에 "웹훅이 왜 아무 일도 안 했지"를 조사할 때 바로 막힌다.
-- =========================================================

alter table public.kakao_webhook_events
  drop constraint if exists kakao_webhook_events_outcome_check;

alter table public.kakao_webhook_events
  add constraint kakao_webhook_events_outcome_check
  check (outcome in ('withdrawn', 'already_withdrawn', 'no_match', 'ignored', 'error'));

comment on column public.kakao_webhook_events.outcome is
  'withdrawn=탈퇴 처리함 / already_withdrawn=이미 탈퇴 상태(재시도·중복) / '
  'no_match=우리 DB에 없는 카카오 회원번호 / ignored=처리 대상이 아닌 이벤트(연결·동의 등) / '
  'error=검증 실패 또는 우리 쪽 장애. 🔴 ignored와 no_match를 섞지 말 것 - 전자는 '
  '"안 하기로 한 것", 후자는 "하려 했는데 대상이 없던 것"이라 조사 방향이 다르다.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname = 'kakao_webhook_events_outcome_check';
-- select outcome, count(*) from public.kakao_webhook_events group by 1;
