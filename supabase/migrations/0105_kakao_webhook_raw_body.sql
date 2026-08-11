-- =========================================================
-- 0105_kakao_webhook_raw_body.sql
-- 검증 실패한 웹훅 요청의 "무엇이 왔는지"를 남긴다(CTO 요청 2026-08-11).
--
-- 배경: 지금은 검증 실패 시 error_message에 'MALFORMED_JWT' 같은 코드만 남는다.
-- 그 코드만으로는 두 가지가 구분되지 않는다:
--   (가) 카카오가 우리가 기대하는 형식(secevent+jwt)을 안 보냈다
--   (나) 우리 파싱이 틀렸다
-- 원문 앞부분과 Content-Type이 있으면 이 둘이 즉시 갈린다.
--
-- 🔴 성공 건에는 안 쓴다. 성공하면 raw_claims에 이미 검증된 페이로드가 남는다.
-- 여기 쌓이는 것은 "검증을 통과하지 못한 요청"뿐이다.
-- =========================================================

alter table public.kakao_webhook_events
  add column if not exists raw_body_prefix text,
  add column if not exists content_type text;

comment on column public.kakao_webhook_events.raw_body_prefix is
  '검증 실패 시에만 채운다. 수신 본문 앞 500자. 🔴 전체를 저장하지 않는다 - 이 엔드포인트는 '
  '공개돼 있어 아무나 임의 본문을 POST할 수 있고, 그걸 통째로 쌓으면 로그 테이블이 '
  '외부 입력의 저장소가 된다. 원인 판별에는 앞부분이면 충분하다(JWT는 헤더가 앞에 온다).';

comment on column public.kakao_webhook_events.content_type is
  '수신 요청의 Content-Type. 카카오 규격은 application/secevent+jwt다. '
  '이 값이 다르면 "카카오가 다른 걸 보냈다", 같은데 파싱이 실패하면 "우리 쪽 문제"로 갈린다.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select received_at, outcome, error_message, content_type, left(raw_body_prefix, 120)
--   from public.kakao_webhook_events order by received_at desc limit 20;
