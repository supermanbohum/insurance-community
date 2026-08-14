-- =========================================================
-- 0113_branch_planner_business_card_nullable.sql
-- 설계사 연결 심사가 **한 번도 성공할 수 없었던** 제약 충돌 해소
--
-- 🔴 실행: 오너 (SQL 편집기). 저장소 선행 기록 - 이 파일이 먼저다.
--
-- ---------------------------------------------------------
-- 무엇이 문제였나 (2026-08-14 운영 실측)
-- ---------------------------------------------------------
-- 운영자가 /admin/planner-links 에서 승인을 누르면 400. Postgres 로그:
--
--     null value in column "business_card_path" of relation
--     "branch_planner_registrations" violates not-null constraint
--
-- `review_branch_planner_registration`(0112)은 승인/반려 시 명함·소득증빙 경로를
-- null로 비운다(심사용으로만 받은 서류라 판정 후 참조를 남기지 않는다 - 0112 머리말).
-- 그런데 `business_card_path`가 **NOT NULL**이라 그 UPDATE 자체가 항상 죽는다.
-- ⚠️ 운영자 경로 문제가 아니다 - **지점장이 눌렀어도 똑같이 실패**한다. 이 RPC의
-- 승인/반려는 만들어진 뒤 한 번도 성공한 적이 없는 코드였다(pending 6건이 그 증거다).
--
-- ---------------------------------------------------------
-- 왜 제약을 푸는 쪽인가 (RPC를 고치는 쪽이 아니라)
-- ---------------------------------------------------------
-- 「명함 필수」는 **등록 시점** 요건이고, 등록 경로(RPC)가 값을 반드시 넣는다.
-- 「판정 후 서류 참조를 남기지 않는다」는 오너가 확정한 심사 원칙이다(0112).
-- 두 요구는 시점이 달라 충돌하지 않는다 - 충돌한 것은 원칙이 아니라, 등록 시점
-- 요건을 **수명 전체의 제약**으로 박아 둔 스키마다. NOT NULL을 풀고 등록 검증은
-- 지금처럼 RPC에 맡긴다.
-- (빈 문자열('')로 우회하지 않는다 - "경로가 ''인 행"은 다음 사람이 반드시 오독한다.)
-- =========================================================

alter table public.branch_planner_registrations
  alter column business_card_path drop not null;

comment on column public.branch_planner_registrations.business_card_path is
  '명함 이미지 경로. 등록 시 필수(등록 RPC가 보장)이며, 심사 판정(승인/반려) 후에는 '
  'review_branch_planner_registration이 null로 비운다 - 심사용으로만 받은 서류라 참조를 남기지 않는다(0112).';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select is_nullable from information_schema.columns
--  where table_name='branch_planner_registrations' and column_name='business_card_path';  -- YES
