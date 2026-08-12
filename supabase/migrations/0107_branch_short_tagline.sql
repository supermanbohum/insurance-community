-- =========================================================
-- 0107_branch_short_tagline.sql
-- 지점 카드의 「짧은 소개」 신설 (오너 확정 2026-08-12).
--
-- 배경: 오너가 지점명 오른쪽 빈 공간에 소개를 넣으라고 지시했는데, 기존 「한 줄 소개」
-- (tagline)를 그 자리로 옮겼더니 190px 캐러셀 카드에서 5글자만 보였다. 오너 판단은
-- "자르지 말고 짧은 것을 따로 받는다"였다:
--
--   tagline(기존)        지점명 아래. 길이 제한 그대로. 원래 자리로 복귀
--   short_tagline(신설)  지점명 오른쪽. 작은 글씨. 10자 미만
--
-- 🔴 둘은 서로 다른 문구다. tagline을 잘라 쓰는 것이 아니다 - 같은 말이 두 번 보이면
-- 오른쪽에 넣는 의미가 없다.
-- 🔴 선택 입력이다. 비어 있으면 카드 오른쪽을 그냥 비운다(대체 텍스트·placeholder 금지).
--
-- ⚠️ 상한 9자는 오너 지시(「10자 미만」)이자 **절대 상한**이다. 디자인 실측이 더 짧은
-- 값을 내면 앱 코드가 그 값으로 더 좁게 막고(SHORT_TAGLINE_MAX_LENGTH), DB는 이
-- 상한을 그대로 유지한다 - 실측값은 바뀔 수 있지만 오너가 정한 천장은 안 바뀐다.
-- =========================================================

alter table public.ga_branch
  add column if not exists short_tagline text;

-- 공백만 들어오는 것을 막고(빈 문자열은 "없음"과 구분되지 않는다) 상한을 강제한다.
alter table public.ga_branch
  drop constraint if exists ga_branch_short_tagline_length_check;

alter table public.ga_branch
  add constraint ga_branch_short_tagline_length_check
  check (
    short_tagline is null
    or (btrim(short_tagline) <> '' and char_length(btrim(short_tagline)) <= 9)
  );

comment on column public.ga_branch.short_tagline is
  '지점명 오른쪽에 작게 붙는 짧은 소개(9자 이내, 선택 입력). 🔴 tagline(지점명 아래 '
  '한 줄 소개)과 서로 다른 문구다 - 같은 말을 자른 것이 아니다. 비어 있으면 카드 '
  '오른쪽을 비운다. 상한 9자는 오너 확정(2026-08-12)이며 앱은 더 좁게 막을 수 있다.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name, data_type, is_nullable from information_schema.columns
--  where table_name='ga_branch' and column_name='short_tagline';
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname='ga_branch_short_tagline_length_check';
-- select count(*) from public.ga_branch where short_tagline is not null;
