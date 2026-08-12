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
--
-- ---------------------------------------------------------
-- 🔴 이 파일은 2026-08-12에 **운영 DB에 맞춰 다시 썼다.**
--
-- 무슨 일이 있었나: 이 파일이 커밋된 뒤, 이 파일이 아닌 **다른 SQL**이 운영에 적용됐다
-- (오너/CTO 경로). 결과가 미묘하게 달랐다:
--   - 제약 이름   파일 ga_branch_short_tagline_length_check ↔ 운영 ga_branch_short_tagline_check
--   - 길이 기준   파일 char_length(btrim(short_tagline)) ↔ 운영 char_length(short_tagline)
--   - 컬럼 코멘트 전혀 다른 문구
--
-- 이름이 다르므로 옛 파일의 `drop constraint if exists ...length_check`는 운영 제약을
-- 지우지 못한다. 그대로 두면 **운영에 제약이 2개 생기고**, 새 환경에는 운영과 다른
-- 제약 1개가 생겨 두 환경이 갈라진다. 그래서 파일을 운영 실물에 맞춰 고쳤다.
--
-- 확인 방법(추측 아님): pg_constraint + pg_get_constraintdef로 ga_branch의
-- short_tagline 제약 정의를, col_description으로 컬럼 코멘트를 그대로 읽어 비교했다.
-- 아래 본문은 그 조회 결과를 옮긴 것이다.
--
-- ⚠️ 길이 기준이 btrim이 아니라 raw인 점에 주의: " 신입환영 "(앞뒤 공백 포함 11자)은
-- 이 제약에 걸린다. 앱이 보내기 전에 trim하므로 실사용에서는 차이가 없지만,
-- SQL로 직접 넣을 때는 다르다.
-- =========================================================

alter table public.ga_branch
  add column if not exists short_tagline text;

-- 공백만 들어오는 것을 막고(빈 문자열은 "없음"과 구분되지 않는다) 상한을 강제한다.
alter table public.ga_branch
  drop constraint if exists ga_branch_short_tagline_check;

alter table public.ga_branch
  add constraint ga_branch_short_tagline_check
  check (
    short_tagline is null
    or (
      char_length(short_tagline) >= 1
      and char_length(short_tagline) <= 9
      and btrim(short_tagline) <> ''
    )
  );

-- 옛 판(이 파일의 첫 커밋)이 이미 돌아간 환경이 있으면 이름만 다른 같은 제약이 남는다.
alter table public.ga_branch
  drop constraint if exists ga_branch_short_tagline_length_check;

comment on column public.ga_branch.short_tagline is
  '지점명 오른쪽에 붙는 짧은 소개(선택 입력). 오너 확정 「10자 미만」 = 9자 이하(0107). '
  '🔴 목록 카드에서는 전부 들어갈 때만 표시하고, 안 들어가면 자르지 않고 숨긴다 - '
  '지점명은 식별자라 지점명을 자르는 쪽이 더 나쁘다(CTO 판정 2026-08-12). '
  '한 줄 소개(지점명 아래)와는 별개 필드다 - 둘은 서로 다른 내용을 담는다.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select column_name, data_type, is_nullable from information_schema.columns
--  where table_name='ga_branch' and column_name='short_tagline';
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid='public.ga_branch'::regclass
--    and pg_get_constraintdef(oid) ilike '%short_tagline%';   -- 정확히 1건이어야 한다
-- select count(*) from public.ga_branch where short_tagline is not null;
