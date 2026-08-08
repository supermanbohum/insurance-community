-- =========================================================
-- 0073_admin_comment.sql (W-085, P1)
-- W-084로 create_comment()가 admin/system 명의를 신뢰하지 않게 막으면서, 콘텐츠팀이
-- 준비한 "보험맵 운영팀" 명의 마중물 댓글을 쓸 방법이 없어졌다 - admin_create_post()와
-- 동일한 원칙(관리자 인증을 거치는 별도 경로)으로 admin_create_comment_as()를 새로 연다.
-- 0072 적용 후 실행.
-- =========================================================

create or replace function public.admin_create_comment_as(
  p_post_id uuid,
  p_content text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_profile_id uuid;
  v_comment_id_out uuid;
  v_parent_post_id uuid;
  v_parent_of_parent uuid;
begin
  v_admin_id := public.current_admin_id();
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
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

  select id into v_profile_id from public.anonymous_profiles where auth_user_id = auth.uid();
  if v_profile_id is null then
    insert into public.anonymous_profiles (auth_user_id, last_author_name)
    values (auth.uid(), '보험맵 운영팀')
    returning id into v_profile_id;
  end if;

  insert into public.comments (
    post_id, parent_comment_id, author_id, author_admin_id, content, author_display_name, author_name_type, status
  ) values (
    p_post_id, p_parent_comment_id, v_profile_id, v_admin_id, p_content, '보험맵 운영팀', 'admin', 'visible'
  ) returning id into v_comment_id_out;

  update public.posts
  set organic_comment_count = organic_comment_count + 1
  where id = p_post_id;

  return v_comment_id_out;
end;
$$;

grant execute on function public.admin_create_comment_as(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'admin_create_comment_as';
