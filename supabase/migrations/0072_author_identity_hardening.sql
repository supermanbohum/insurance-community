-- =========================================================
-- 0072_author_identity_hardening.sql (W-084, P0 보안)
-- create_comment()(0070)와 create_post()(0004/0069) 둘 다 클라이언트가 보낸
-- p_author_name_type을 검증 없이 그대로 INSERT했다 - RPC를 직접 호출하면
-- 일반 정회원이 p_author_name_type='admin' + p_author_display_name='보험맵 운영팀'로
-- 관리자 명의를 사칭할 수 있었다(SECURITY DEFINER + 클라이언트 파라미터 통제 가능
-- 조합). admin_create_post()는 current_admin_id() 검증 + author_admin_id 기록이
-- 이미 있어 이 문제가 없다 - 문제는 일반 경로(create_post/create_comment) 쪽이다.
--
-- 수정 방향: 일반 경로에서는 'admin'/'system' 타입 자체를 아예 신뢰하지 않는다
-- (요청값과 무관하게 항상 'random' 또는 'custom'으로 강제). 관리자 명의가 필요하면
-- admin_create_post() 같은 별도의, current_admin_id() 검증을 거치는 경로로만
-- 가능해야 한다 - 이 RPC들은 그 경로가 아니다.
-- 추가로 "보험맵 운영팀"/"운영팀"/"관리자" 같은 공식 명칭은 custom 닉네임으로도
-- 못 쓰게 정확히 일치하는 경우만 차단한다(부분 문자열이 아니라 완전 일치 -
-- "관리자님" 같은 정상적인 자기소개 문구까지 막지 않기 위함).
-- 0071 적용 후 실행.
-- =========================================================

create or replace function public.create_comment(
  p_post_id uuid,
  p_content text,
  p_author_display_name text,
  p_author_name_type public.author_name_type default 'random',
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_comment_id uuid;
  v_name_max_len int;
  v_parent_post_id uuid;
  v_parent_of_parent uuid;
  v_safe_name_type public.author_name_type;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_full_member() then
    raise exception 'NOT_FULL_MEMBER';
  end if;

  if public.is_current_user_blocked() then
    raise exception 'USER_BLOCKED';
  end if;

  if length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select (value)::int into v_name_max_len from public.site_settings where key = 'author_name_max_length';
  if length(trim(p_author_display_name)) = 0
     or length(p_author_display_name) > coalesce(v_name_max_len, 12) then
    raise exception 'INVALID_AUTHOR_NAME';
  end if;

  if lower(trim(p_author_display_name)) in ('보험맵 운영팀', '운영팀', '관리자', 'admin', 'system') then
    raise exception 'RESERVED_AUTHOR_NAME';
  end if;

  -- 이 경로에는 관리자 인증 절차가 없으므로 admin/system 타입은 절대 신뢰하지 않는다.
  v_safe_name_type := case when p_author_name_type = 'custom' then 'custom' else 'random' end;

  if not exists (
    select 1 from public.posts where id = p_post_id and status = 'visible' and deleted_at is null
  ) then
    raise exception 'POST_NOT_FOUND';
  end if;

  if p_parent_comment_id is not null then
    select post_id, parent_comment_id into v_parent_post_id, v_parent_of_parent
    from public.comments
    where id = p_parent_comment_id and status = 'visible' and deleted_at is null;

    if v_parent_post_id is null or v_parent_post_id <> p_post_id then
      raise exception 'INVALID_PARENT_COMMENT';
    end if;

    if v_parent_of_parent is not null then
      raise exception 'INVALID_PARENT_COMMENT';
    end if;
  end if;

  if public.contains_banned_word(p_content) or public.contains_banned_word(p_author_display_name) then
    raise exception 'BANNED_WORD';
  end if;

  perform public.assert_comment_rate_limit(v_profile_id);
  perform public.assert_comment_not_duplicate(v_profile_id, p_content);

  insert into public.comments (
    post_id, parent_comment_id, author_id, content, author_display_name, author_name_type, status
  ) values (
    p_post_id, p_parent_comment_id, v_profile_id, p_content, p_author_display_name, v_safe_name_type, 'visible'
  ) returning id into v_comment_id;

  update public.posts
  set organic_comment_count = organic_comment_count + 1
  where id = p_post_id;

  update public.anonymous_profiles
  set last_author_name = p_author_display_name
  where id = v_profile_id;

  return v_comment_id;
end;
$$;

-- create_post() 재정의 - 0069 원본에서 author_name_type 강제 + 예약어 차단 두 줄만 추가.
create or replace function public.create_post(
  p_category_id uuid,
  p_title text,
  p_content text,
  p_author_display_name text,
  p_author_name_type public.author_name_type default 'random'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_post_id uuid;
  v_name_max_len int;
  v_safe_name_type public.author_name_type;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.is_current_user_blocked() then
    raise exception 'USER_BLOCKED';
  end if;

  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select (value)::int into v_name_max_len from public.site_settings where key = 'author_name_max_length';
  if length(trim(p_author_display_name)) = 0
     or length(p_author_display_name) > coalesce(v_name_max_len, 12) then
    raise exception 'INVALID_AUTHOR_NAME';
  end if;

  if lower(trim(p_author_display_name)) in ('보험맵 운영팀', '운영팀', '관리자', 'admin', 'system') then
    raise exception 'RESERVED_AUTHOR_NAME';
  end if;

  -- admin_create_post()가 관리자 명의 발행의 유일한 경로다 - 이 일반 경로는 절대
  -- admin/system 타입을 신뢰하지 않는다.
  v_safe_name_type := case when p_author_name_type = 'custom' then 'custom' else 'random' end;

  if not exists (
    select 1 from public.categories
    where id = p_category_id and is_active = true and admin_only_write = false
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  if public.contains_banned_word(p_title)
     or public.contains_banned_word(p_content)
     or public.contains_banned_word(p_author_display_name) then
    raise exception 'BANNED_WORD';
  end if;

  perform public.assert_post_rate_limit(v_profile_id);
  perform public.assert_post_not_duplicate(v_profile_id, p_content);

  insert into public.posts (
    category_id, author_id, title, content, author_display_name, author_name_type, status
  ) values (
    p_category_id, v_profile_id, p_title, p_content, p_author_display_name, v_safe_name_type, 'hidden'
  ) returning id into v_post_id;

  update public.anonymous_profiles
  set last_author_name = p_author_display_name
  where id = v_profile_id;

  return v_post_id;
end;
$$;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname, prosrc ilike '%RESERVED_AUTHOR_NAME%' from pg_proc where proname in ('create_post','create_comment');
