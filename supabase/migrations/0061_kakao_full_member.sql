-- =========================================================
-- 0061_kakao_full_member.sql (W-033)
-- 카카오 로그인 사용자를 정회원(is_full_member)으로 인정한다 - 오너 승인(2026-08-07).
-- 정책: (provider='email' AND email_verified_at IS NOT NULL) OR
--       (provider='kakao' AND kakao_verified_contact IS NOT NULL)
-- 함수 내부만 확장하고 호출부(RLS/RPC 9곳, 페이지 가드 8곳)는 그대로 둔다 - 기존
-- 이메일 회원 자격에는 어떤 변화도 없다.
-- =========================================================

alter table public.users
  add column if not exists kakao_verified_contact text;

comment on column public.users.kakao_verified_contact is
  '카카오 로그인 시 카카오가 검증해 제공한 연락처(이메일 또는 전화번호) - 이 값이 있으면
   provider=kakao 회원도 is_full_member()가 true를 반환한다. 우리 쪽 별도 인증 절차 없음
   (카카오가 이미 검증한 값을 신뢰).';

create or replace function public.is_full_member()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.users
    where auth_user_id = auth.uid()
    and approval_status = 'approved'
    and (
      (provider = 'email' and email_verified_at is not null)
      or (provider = 'kakao' and kakao_verified_contact is not null)
    )
  );
$$;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select provider, count(*), count(kakao_verified_contact) from public.users group by 1;
