-- =========================================================
-- 0103_kakao_account_status_webhook.sql
-- 카카오 "계정 상태 변경 웹훅(User Unlinked)" 수신 처리(오너 확정 2026-08-11).
--
-- 배경: 사용자가 카카오 쪽에서 우리 앱 연결을 끊거나 카카오 계정을 탈퇴하면 우리는
-- 그 사실을 모르고, 그 사람의 개인정보가 DB에 그대로 남는다. 방금 배포한 /privacy가
-- "탈퇴 시 지체 없이 파기"를 약속하는데 카카오 경로로 나간 사람은 그 약속 밖에 있었다.
--
-- 🔴 처리 방식은 (가) 탈퇴 처리다. (나) "연결만 해제하고 계정 유지"는 성립하지 않는다 -
-- 카카오 가입자는 비밀번호가 없어(방침 제1조) 연결이 끊기면 로그인 수단이 아예 사라지고,
-- 계정을 남기면 아무도 접근할 수 없는 곳에 개인정보만 남는다. 본인도 못 들어가서
-- 삭제 요청조차 화면으로 못 한다.
--
-- 적용 전 확인한 스키마 사실(운영 DB 조회):
--   auth.identities(provider='kakao').provider_id = 카카오 회원번호 = SET의 sub
--   posts/comments.author_id → anonymous_profiles (public.users가 아니다)
--     → 사용자 행을 지워도 글은 안 지워지지만, 애초에 지우지 않는다(아래 참조)
--   public.users를 삭제하면 chat_messages·favorites·planner_profiles·top_designer_likes·
--     user_ga_change_requests가 CASCADE로 함께 지워진다 → 🔴 삭제하지 않고 익명화한다
--   public 테이블 어디에도 auth.users를 향한 FK가 없다
-- =========================================================

-- ---------------------------------------------------------
-- 1) 탈퇴 시각 컬럼
-- ---------------------------------------------------------
-- approval_status는 approved/pending/rejected 셋뿐이라 "탈퇴"를 표현할 수 없다.
-- rejected로만 두면 "가입 거절"과 "본인 탈퇴"가 구분되지 않아, 나중에 통계도
-- 문의 응대도 틀린다.
alter table public.users
  add column if not exists withdrawn_at timestamptz;

comment on column public.users.withdrawn_at is
  '탈퇴 처리 시각. 카카오 연결 해제 웹훅(0103) 또는 향후 자체 탈퇴 경로가 채운다. '
  'null이면 정상 회원. approval_status=rejected와 구분해서 볼 것 - 그건 가입 거절이다.';

create index if not exists idx_users_withdrawn_at on public.users (withdrawn_at)
  where withdrawn_at is not null;

-- ---------------------------------------------------------
-- 2) 수신 로그
-- ---------------------------------------------------------
-- 🔴 매칭 실패도 반드시 남긴다. 0건 구간에서는 "웹훅이 안 온 것"과 "와서 처리된 것"이
-- 같은 모양이라(빈 테이블), 로그가 없으면 등록이 됐는지조차 검증할 수 없다.
create table if not exists public.kakao_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  -- SET(JWT)의 sub. 우리에게 없는 값이 올 수도 있어 FK를 걸지 않는다.
  kakao_user_id text,
  -- events 안의 reason (ACCOUNT_DELETE · UNLINK_FROM_APPS 등). 카카오가 값을 늘릴 수
  -- 있으므로 enum/check로 묶지 않는다 - 모르는 값이 와도 기록은 남아야 한다.
  reason text,
  -- 검증을 통과한 JWT의 claims 원문. 나중에 "무엇이 왔는지"를 다시 볼 유일한 근거다.
  raw_claims jsonb,
  matched_user_id uuid references public.users (id) on delete set null,
  outcome text not null,
  error_message text,
  constraint kakao_webhook_events_outcome_check
    check (outcome in ('withdrawn', 'already_withdrawn', 'no_match', 'error'))
);

comment on table public.kakao_webhook_events is
  '카카오 계정 상태 변경 웹훅 수신 로그. 🔴 매칭 실패(no_match)도 기록한다 - '
  '"안 온 것"과 "와서 못 찾은 것"을 구분할 수 없으면 등록 여부조차 검증 불가다.';

alter table public.kakao_webhook_events enable row level security;
-- 정책을 만들지 않는다 = 서비스롤만 접근. 일반 사용자·회원 누구도 못 읽는다.

-- ---------------------------------------------------------
-- 3) 탈퇴 처리 RPC
-- ---------------------------------------------------------
-- 🔴 outcome과 함께 user_id를 돌려준다. 라우트가 로그에 matched_user_id를 남겨야
-- 하는데, 그걸 알아내려고 라우트에서 다시 조회하면 auth 스키마를 거쳐야 해서
-- 서비스롤 클라이언트로는 깔끔하지 않다. 찾은 쪽이 알려주는 게 맞다.
create or replace function public.withdraw_kakao_user(p_kakao_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_auth_user_id uuid;
  v_user public.users;
begin
  if p_kakao_user_id is null or btrim(p_kakao_user_id) = '' then
    return jsonb_build_object('outcome', 'no_match', 'user_id', null);
  end if;

  -- 카카오 회원번호 → 우리 auth 사용자. Supabase가 OAuth 연동 시 identities에
  -- provider_id로 그대로 넣어준다(운영 데이터로 확인: kakao:5030757453).
  select i.user_id into v_auth_user_id
  from auth.identities i
  where i.provider = 'kakao' and i.provider_id = btrim(p_kakao_user_id)
  limit 1;

  if v_auth_user_id is null then
    return jsonb_build_object('outcome', 'no_match', 'user_id', null);
  end if;

  select * into v_user from public.users where auth_user_id = v_auth_user_id;
  if v_user.id is null then
    return jsonb_build_object('outcome', 'no_match', 'user_id', null);
  end if;
  if v_user.withdrawn_at is not null then
    -- 카카오가 재시도하거나 같은 사건이 두 번 오면 여기로 온다. 두 번째를 오류로
    -- 취급하면 로그가 error로 더럽혀지고, 진짜 오류를 찾을 때 묻힌다.
    return jsonb_build_object('outcome', 'already_withdrawn', 'user_id', v_user.id);
  end if;

  -- 🔴 행을 지우지 않는다. public.users 삭제는 chat_messages·favorites·
  -- planner_profiles·top_designer_likes·user_ga_change_requests를 CASCADE로 함께
  -- 지운다(운영 제약 조회로 확인). 남의 대화까지 사라진다.
  -- 대신 개인정보 필드만 비운다.
  update public.users set
    nickname = '탈퇴한 회원',
    email = null,
    contact = null,
    profile_image = null,
    username = null,
    kakao_verified_contact = null,
    ga_company_id = null,
    approval_status = 'rejected',
    withdrawn_at = now(),
    updated_at = now()
  where id = v_user.id;

  -- 글·댓글은 남기고 작성자 표시만 익명화한다. author_id가 anonymous_profiles를
  -- 가리키고 화면에 뜨는 이름은 last_author_name이라, 여기만 바꾸면 본문은 그대로
  -- 두고 이름만 사라진다. 🔴 글을 지우면 남의 대화 맥락이 통째로 무너진다.
  update public.anonymous_profiles
  set last_author_name = '탈퇴한 회원', updated_at = now()
  where auth_user_id = v_auth_user_id;

  -- 푸시 토큰 즉시 삭제. 이게 남으면 탈퇴한 사람의 기기로 알림이 계속 간다.
  delete from public.push_tokens where auth_user_id = v_auth_user_id;

  -- ⚠️ auth.users / auth.identities는 지우지 않는다.
  -- (1) 카카오가 이미 연결을 끊었으므로 카카오 로그인 자체가 불가능하고,
  --     비밀번호가 없어 다른 로그인 수단도 없다 - 접근은 이미 차단된 상태다.
  -- (2) identities를 지우면 재시도·중복 웹훅이 'no_match'로 떨어져
  --     "우리 사용자가 아니었다"와 구분되지 않는다. 감사 추적이 망가진다.
  return jsonb_build_object('outcome', 'withdrawn', 'user_id', v_user.id);
end;
$$;

revoke all on function public.withdraw_kakao_user(text) from public, anon, authenticated;

comment on function public.withdraw_kakao_user(text) is
  '카카오 연결 해제 시 탈퇴 처리. 🔴 서비스롤 전용(웹훅 라우트에서만 호출). '
  '행을 지우지 않고 개인정보만 비운다 - 삭제하면 채팅·즐겨찾기 등이 CASCADE로 함께 사라진다.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'withdraw_kakao_user';
-- select column_name from information_schema.columns
--  where table_name='users' and column_name='withdrawn_at';
-- select * from public.kakao_webhook_events order by received_at desc limit 20;
