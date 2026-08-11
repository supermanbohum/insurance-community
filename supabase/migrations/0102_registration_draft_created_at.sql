-- =========================================================
-- 0102_registration_draft_created_at.sql
-- 지점 등록 임시저장에 생성 시각을 남긴다(CTO 승인 2026-08-11).
--
-- 🔴 왜 필요한가 - 우리가 방금 만든 개선을 우리가 볼 수 없다.
-- 오늘 조사에서 나온 사실: 가입 관리자 7명 중 4명은 draft조차 없다(폼에 들어오기
-- 전에 이탈). 그 앞자리를 겨냥해 "준비물 안내"를 배포했는데, drafts에 updated_at만
-- 있고 created_at이 없어 "안내를 붙인 뒤 시작률이 올랐는지"를 볼 방법이 없다.
-- 같은 사람이 두 번 왔는지도 알 수 없다(갱신 시각만 덮어써지므로).
--
-- 이건 오늘 세 번째로 나온 같은 형태다 - site_visits에 UA·referrer가 없어 봇 판별이
-- 불가능한 것, drafts에 생성 시각이 없는 것, "폼 페이지 도달" 이벤트가 없어
-- "안 왔다"와 "와서 아무것도 안 쳤다"를 구분 못 하는 것.
-- 측정 수단이 없으면 개선의 효과도 없음도 증명할 수 없다.
-- =========================================================

alter table public.ga_admin_registration_drafts
  add column if not exists created_at timestamptz not null default now();

-- 🔴 기존 행 소급 보정.
-- 이미 있던 행은 default now()가 박히는데, 그건 "마이그레이션을 돌린 시각"이지
-- 사용자가 작성을 시작한 시각이 아니다. 우리가 아는 유일한 시각인 updated_at으로
-- 되돌린다.
--
-- ⚠️ 이 값은 실제 생성 시각이 아니라 "마지막 갱신 시각으로 소급 추정한 값"이다.
-- updated_at보다 앞설 수는 있어도 뒤설 수는 없으므로 상한선으로만 읽어야 한다.
-- 앞으로 쌓이는 행만 실제 생성 시각을 갖는다 - 이 경계를 모르고 분석하면
-- "안내 배포 전에도 시작이 있었다"를 잘못 읽게 된다.
update public.ga_admin_registration_drafts
set created_at = updated_at
where created_at > updated_at;

comment on column public.ga_admin_registration_drafts.created_at is
  '작성 시작 시각. 2026-08-11 이전에 만들어진 행은 실제 값이 아니라 updated_at으로 '
  '소급 추정한 값이다(그 전에는 이 컬럼이 없었다). 유입 개선 효과를 볼 때 그 경계를 '
  '넘겨 비교하지 말 것.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--  where table_name = 'ga_admin_registration_drafts' and column_name = 'created_at';
--
-- 소급 보정이 먹었는지(created_at > updated_at 인 행이 0이어야 한다):
-- select count(*) from public.ga_admin_registration_drafts where created_at > updated_at;
