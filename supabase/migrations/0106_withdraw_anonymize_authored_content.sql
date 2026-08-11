-- =========================================================
-- 0106_withdraw_anonymize_authored_content.sql
-- 🔴 0103 결함 수정 — 탈퇴 처리가 글·댓글의 작성자 이름을 실제로는 못 바꾸고 있었다.
--
-- 0103은 anonymous_profiles.last_author_name만 '탈퇴한 회원'으로 바꿨고,
-- 그 파일 주석에 "화면에 뜨는 이름은 last_author_name"이라고 적었다. **그게 틀렸다.**
--
-- 확인한 사실:
--   posts.author_display_name / comments.author_display_name  ← 행마다 저장(not null)
--   화면(PostCard.tsx:55, CommentSection)과 서버 조회(lib/posts/comments.ts의
--   COMMENT_SELECT, lib/admin/community.ts)가 전부 이 컬럼을 읽는다
--   anonymous_profiles.last_author_name은 0001 주석대로 "참고용 서버 저장(선택)"이라
--   어느 화면에도 안 쓰인다
--
-- 즉 카카오 연결 해제로 탈퇴 처리된 사용자의 **닉네임이 글·댓글에 그대로 남아 있었다.**
-- users 테이블의 개인정보는 지워지는데 커뮤니티에는 이름이 계속 보이는 상태였다.
--
-- 🔴 이 마이그레이션이 적용되기 전에는 "작성자 표시만 익명으로 바뀝니다"라는
-- 고지 문구를 내보내면 안 된다 - 사실이 아닌 개인정보 고지가 된다.
--
-- ⚠️ 이 파일은 커밋 후 한 번 수정됐다(운영팀 글 제외 조건 추가). 수정 시점에
-- 운영 DB에 **미적용 상태임을 pg_proc로 확인**하고 고쳤다 - 이미 적용된
-- 마이그레이션이었다면 새 파일(0107)을 만들었어야 한다.
-- =========================================================

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
    return jsonb_build_object('outcome', 'already_withdrawn', 'user_id', v_user.id);
  end if;

  -- 🔴 행을 지우지 않는다. public.users 삭제는 chat_messages·favorites·
  -- planner_profiles·top_designer_likes·user_ga_change_requests를 CASCADE로 함께
  -- 지운다(운영 제약 조회로 확인). 남의 대화까지 사라진다. 개인정보 필드만 비운다.
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

  -- 🔴 여기가 0106에서 고친 부분이다. 글·댓글은 남기고 작성자 이름만 익명화한다.
  -- author_display_name은 작성 시점에 행에 박히는 값이라, 프로필 쪽만 바꾸면
  -- 화면에는 예전 이름이 그대로 보인다.
  --
  -- 🔴 운영팀 글(author_name_type = 'admin')은 제외한다. 근거(운영 데이터로 확인):
  --   - 관리자 글 7건·댓글 3건의 author_display_name은 전부 「보험맵 운영팀」이다.
  --     사람 이름이 아니라 **조직 표기**라 개인정보가 아니고, 익명화해서 얻는 것이 없다.
  --   - 그 10건 전부 author_admin_id가 있고 화면에 인증 배지가 붙는다(admin 렌더 경로).
  --     「탈퇴한 회원」으로 바꾸면 공지가 탈퇴자 글처럼 보여 **공지의 정체성만 깨진다.**
  --   - 관리자 글도 anonymous_profiles 행을 갖고 그 행에 auth_user_id가 채워져 있어
  --     (0063·0073), 제외하지 않으면 운영팀 계정이 카카오 연결을 끊는 순간
  --     과거 공지 전부가 「탈퇴한 회원」이 된다.
  --
  -- ⚠️ 잠금 범위: 이 UPDATE는 **탈퇴하는 사용자 본인의 행만** 건드린다(테이블 전체가
  -- 아니다). author_display_name에 걸린 인덱스는 없어(pg_indexes 조회 확인) 인덱스
  -- 갱신 비용도 없다.
  update public.posts p set author_display_name = '탈퇴한 회원'
  where p.author_id in (
    select ap.id from public.anonymous_profiles ap where ap.auth_user_id = v_auth_user_id
  )
  and p.author_name_type <> 'admin'
  and p.author_display_name is distinct from '탈퇴한 회원';

  update public.comments c set author_display_name = '탈퇴한 회원'
  where c.author_id in (
    select ap.id from public.anonymous_profiles ap where ap.auth_user_id = v_auth_user_id
  )
  and c.author_name_type <> 'admin'
  and c.author_display_name is distinct from '탈퇴한 회원';

  -- ⚠️ author_name_type 자체는 바꾸지 않는다. 표시 규칙(배지 유무)을 이 함수가
  -- 대신 정하게 되기 때문이다. 여기서는 이름만 바꾼다.

  -- 참고용 필드도 함께 맞춰 둔다(화면에는 안 쓰이지만 남겨두면 값이 어긋난다).
  update public.anonymous_profiles
  set last_author_name = '탈퇴한 회원', updated_at = now()
  where auth_user_id = v_auth_user_id;

  -- 푸시 토큰 즉시 삭제. 이게 남으면 탈퇴한 사람의 기기로 알림이 계속 간다.
  delete from public.push_tokens where auth_user_id = v_auth_user_id;

  -- ⚠️ auth.users / auth.identities는 지우지 않는다(0103 주석 참고).
  return jsonb_build_object('outcome', 'withdrawn', 'user_id', v_user.id);
end;
$$;

revoke all on function public.withdraw_kakao_user(text) from public, anon, authenticated;

comment on function public.withdraw_kakao_user(text) is
  '카카오 연결 해제 시 탈퇴 처리. 🔴 서비스롤 전용(웹훅 라우트에서만 호출). '
  '행을 지우지 않고 개인정보만 비우며, 글·댓글은 남기고 author_display_name만 '
  '익명화한다. 🔴 author_display_name은 행마다 저장되는 값이라 반드시 여기서 함께 '
  '바꿔야 한다 - anonymous_profiles.last_author_name은 화면에 쓰이지 않는다(0106).';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- 적용 후 함수 본문에 posts 갱신이 들어갔는지:
-- select pg_get_functiondef(oid) like '%update public.posts%' as has_post_anonymize
--   from pg_proc where proname = 'withdraw_kakao_user';
--
-- 이미 탈퇴 처리된 사용자가 있다면 소급 확인(글에 옛 이름이 남아 있는지):
-- select p.id, p.author_display_name
--   from public.posts p
--   join public.anonymous_profiles ap on ap.id = p.author_id
--   join public.users u on u.auth_user_id = ap.auth_user_id
--  where u.withdrawn_at is not null and p.author_display_name <> '탈퇴한 회원';
