-- =========================================================
-- 0070_comment_write_functions.sql (W-078, P0)
-- comments 테이블/RLS(SELECT)는 0001/0002에 이미 있었지만 쓰기 RPC가 없어서 실제로는
-- 댓글을 달 수 없는 상태였다 - 콘텐츠팀이 이미 발행한 글 5편이 "댓글로 나눠 주세요"라고
-- 요청하고 있는데 그 행동을 할 방법이 없었다.
--
-- create_post()(0004, 0069)의 SECURITY DEFINER + CT-022 도배방지 패턴을 그대로 따른다.
-- 다만 작성 권한은 posts와 다르게 is_full_member() 기준이다(CTO 지시) - 익명 세션만으로는
-- 글은 쓸 수 있어도 댓글은 쓸 수 없다.
-- 대댓글은 comments.parent_comment_id(0001)가 이미 "1단계만 허용"으로 설계돼 있으므로
-- 그 제약을 create_comment()에서 그대로 강제한다.
-- 0069 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. 작성 속도 제한 - CT-022 댓글용 수치(콘텐츠팀 제안): 10초 간격 / 5분 내 10건
-- ---------------------------------------------------------
create or replace function public.assert_comment_rate_limit(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_comment_at timestamptz;
  v_burst_count int;
begin
  select max(created_at) into v_last_comment_at
  from public.comments
  where author_id = p_profile_id and deleted_at is null;

  if v_last_comment_at is not null and v_last_comment_at > now() - interval '10 seconds' then
    raise exception 'RATE_LIMITED';
  end if;

  select count(*) into v_burst_count
  from public.comments
  where author_id = p_profile_id
    and created_at > now() - interval '5 minutes'
    and deleted_at is null;

  if v_burst_count >= 10 then
    raise exception 'BURST_LIMITED';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- B. 직전 자기 댓글과 본문이 완전히 같으면 즉시 차단
-- ---------------------------------------------------------
create or replace function public.assert_comment_not_duplicate(p_profile_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_content text;
begin
  select content into v_last_content
  from public.comments
  where author_id = p_profile_id and deleted_at is null
  order by created_at desc
  limit 1;

  if v_last_content is not null and v_last_content = p_content then
    raise exception 'DUPLICATE_CONTENT';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- C. 댓글 생성
-- ---------------------------------------------------------
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
    p_post_id, p_parent_comment_id, v_profile_id, p_content, p_author_display_name, p_author_name_type, 'visible'
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

-- ---------------------------------------------------------
-- D. admin_set_comment_status() 재정의 - visible <-> hidden/deleted 전환 시
--    posts.organic_comment_count를 함께 보정한다. 원본(0053)은 카운트를 건드리지
--    않았는데, 지금까지 댓글 작성 경로 자체가 없어 드러나지 않았던 결함이다 - 쓰기
--    경로를 새로 여는 김에 함께 고친다(나머지 로직은 0053과 동일).
-- ---------------------------------------------------------
create or replace function public.admin_set_comment_status(p_comment_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_before text;
  v_post_id uuid;
begin
  if v_admin_id is null then raise exception 'NOT_PLATFORM_ADMIN'; end if;
  if p_status not in ('visible', 'hidden', 'deleted') then raise exception 'INVALID_STATUS'; end if;

  select status, post_id into v_before, v_post_id from public.comments where id = p_comment_id;
  if v_before is null then raise exception 'COMMENT_NOT_FOUND'; end if;

  update public.comments
  set status = p_status,
      deleted_at = case when p_status = 'deleted' then now() else null end,
      updated_at = now()
  where id = p_comment_id;

  if v_before = 'visible' and p_status <> 'visible' then
    update public.posts set organic_comment_count = greatest(0, organic_comment_count - 1) where id = v_post_id;
  elsif v_before <> 'visible' and p_status = 'visible' then
    update public.posts set organic_comment_count = organic_comment_count + 1 where id = v_post_id;
  end if;

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, before_value, after_value)
  values (v_admin_id, 'comment', p_comment_id, 'comment_status_change', p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

-- ---------------------------------------------------------
-- E. 실행 권한 부여
-- ---------------------------------------------------------
grant execute on function public.assert_comment_rate_limit(uuid) to anon, authenticated;
grant execute on function public.assert_comment_not_duplicate(uuid, text) to anon, authenticated;
grant execute on function public.create_comment(uuid, text, text, public.author_name_type, uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname in ('create_comment','assert_comment_rate_limit','assert_comment_not_duplicate');
