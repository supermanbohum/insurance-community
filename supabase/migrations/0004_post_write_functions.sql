-- =========================================================
-- 0004_post_write_functions.sql
-- 게시글 쓰기 전용 SECURITY DEFINER 함수 (Phase 2)
-- posts/post_images에는 INSERT/UPDATE/DELETE RLS 정책이 없으므로
-- 모든 쓰기는 이 함수들을 통해서만 이루어진다.
-- 0001 -> 0002 -> 0003 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. 금지어 포함 여부 확인
--    banned_words 테이블은 일반 사용자가 직접 SELECT 할 수 없으므로
--    SECURITY DEFINER 함수로만 대조 가능하게 한다.
-- ---------------------------------------------------------
create or replace function public.contains_banned_word(p_text text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.banned_words w
    where p_text ilike '%' || w.word || '%'
  );
$$;

-- ---------------------------------------------------------
-- B. 작성 속도 제한 (연속 작성 간격 + 일일 작성 한도)
-- ---------------------------------------------------------
create or replace function public.assert_post_rate_limit(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate_limit_seconds int;
  v_daily_limit int;
  v_last_post_at timestamptz;
  v_today_count int;
begin
  select (value)::int into v_rate_limit_seconds from public.site_settings where key = 'post_rate_limit_seconds';
  select (value)::int into v_daily_limit from public.site_settings where key = 'post_daily_limit';

  select max(created_at) into v_last_post_at
  from public.posts
  where author_id = p_profile_id and deleted_at is null;

  if v_last_post_at is not null
     and v_last_post_at > now() - make_interval(secs => coalesce(v_rate_limit_seconds, 60)) then
    raise exception 'RATE_LIMITED';
  end if;

  select count(*) into v_today_count
  from public.posts
  where author_id = p_profile_id
    and created_at > now() - interval '1 day'
    and deleted_at is null;

  if v_today_count >= coalesce(v_daily_limit, 20) then
    raise exception 'DAILY_LIMIT_EXCEEDED';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- C. 게시글 생성
--    이미지 업로드가 남아있을 수 있으므로 status='hidden'으로 생성하고,
--    이미지 처리까지 전부 끝나면 publish_post()로 공개 전환한다.
-- ---------------------------------------------------------
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

  insert into public.posts (
    category_id, author_id, title, content, author_display_name, author_name_type, status
  ) values (
    p_category_id, v_profile_id, p_title, p_content, p_author_display_name, p_author_name_type, 'hidden'
  ) returning id into v_post_id;

  update public.anonymous_profiles
  set last_author_name = p_author_display_name
  where id = v_profile_id;

  return v_post_id;
end;
$$;

-- ---------------------------------------------------------
-- D. 게시글 이미지 추가
-- ---------------------------------------------------------
create or replace function public.add_post_image(
  p_post_id uuid,
  p_storage_path text,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_image_id uuid;
  v_max_count int;
  v_current_count int;
begin
  if not exists (
    select 1 from public.posts
    where id = p_post_id and author_id = public.current_profile_id() and deleted_at is null
  ) then
    raise exception 'NOT_POST_OWNER';
  end if;

  select (value)::int into v_max_count from public.site_settings where key = 'image_max_count_per_post';
  select count(*) into v_current_count from public.post_images where post_id = p_post_id;

  if v_current_count >= coalesce(v_max_count, 5) then
    raise exception 'IMAGE_LIMIT_EXCEEDED';
  end if;

  insert into public.post_images (post_id, storage_path, sort_order)
  values (p_post_id, p_storage_path, p_sort_order)
  returning id into v_image_id;

  return v_image_id;
end;
$$;

-- ---------------------------------------------------------
-- E. 게시글 이미지 삭제 (Storage 정리는 애플리케이션 레이어에서 반환된 경로로 수행)
-- ---------------------------------------------------------
create or replace function public.delete_post_image(p_image_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  select pi.storage_path into v_path
  from public.post_images pi
  join public.posts p on p.id = pi.post_id
  where pi.id = p_image_id and p.author_id = public.current_profile_id();

  if v_path is null then
    raise exception 'NOT_FOUND_OR_NOT_OWNER';
  end if;

  delete from public.post_images where id = p_image_id;

  return v_path;
end;
$$;

-- ---------------------------------------------------------
-- F. 게시글 발행 (hidden -> visible). 이미지 처리까지 끝난 뒤 호출.
-- ---------------------------------------------------------
create or replace function public.publish_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set status = 'visible'
  where id = p_post_id
    and author_id = public.current_profile_id()
    and status = 'hidden';

  if not found then
    raise exception 'NOT_POST_OWNER_OR_ALREADY_PUBLISHED';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- G. 발행 실패 롤백 전용 - status='hidden'인(아직 공개된 적 없는) 글만 완전 삭제.
--    삭제된 이미지들의 storage_path를 반환해 애플리케이션이 Storage 객체를 정리하게 한다.
-- ---------------------------------------------------------
create or replace function public.delete_post_hard(p_post_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paths text[];
begin
  if not exists (
    select 1 from public.posts
    where id = p_post_id and author_id = public.current_profile_id() and status = 'hidden'
  ) then
    raise exception 'NOT_POST_OWNER_OR_ALREADY_PUBLISHED';
  end if;

  select array_agg(storage_path) into v_paths from public.post_images where post_id = p_post_id;

  delete from public.post_images where post_id = p_post_id;
  delete from public.posts where id = p_post_id;

  return coalesce(v_paths, array[]::text[]);
end;
$$;

-- ---------------------------------------------------------
-- H. 게시글 수정
-- ---------------------------------------------------------
create or replace function public.update_post(
  p_post_id uuid,
  p_title text,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if public.contains_banned_word(p_title) or public.contains_banned_word(p_content) then
    raise exception 'BANNED_WORD';
  end if;

  update public.posts
  set title = p_title,
      content = p_content
  where id = p_post_id
    and author_id = public.current_profile_id()
    and deleted_at is null;

  if not found then
    raise exception 'NOT_POST_OWNER';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- I. 게시글 소프트 삭제 - 연결 이미지 행도 함께 제거하고
--    삭제된 storage_path 목록을 반환해 애플리케이션이 Storage 객체를 정리하게 한다.
-- ---------------------------------------------------------
create or replace function public.soft_delete_post(p_post_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paths text[];
begin
  if not exists (
    select 1 from public.posts
    where id = p_post_id and author_id = public.current_profile_id() and deleted_at is null
  ) then
    raise exception 'NOT_POST_OWNER';
  end if;

  select array_agg(storage_path) into v_paths from public.post_images where post_id = p_post_id;

  delete from public.post_images where post_id = p_post_id;

  update public.posts
  set status = 'deleted', deleted_at = now()
  where id = p_post_id;

  return coalesce(v_paths, array[]::text[]);
end;
$$;

-- ---------------------------------------------------------
-- J. 조회수 집계 (중복 조회 방지)
-- ---------------------------------------------------------
create or replace function public.record_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_window_minutes int;
  v_recent_exists boolean;
begin
  if v_profile_id is null then
    return;
  end if;

  select (value)::int into v_window_minutes from public.site_settings where key = 'duplicate_view_window_minutes';

  select exists (
    select 1 from public.post_views
    where post_id = p_post_id
      and anonymous_profile_id = v_profile_id
      and created_at > now() - make_interval(mins => coalesce(v_window_minutes, 30))
  ) into v_recent_exists;

  if not v_recent_exists then
    insert into public.post_views (post_id, anonymous_profile_id)
    values (p_post_id, v_profile_id);

    update public.posts
    set organic_view_count = organic_view_count + 1
    where id = p_post_id;
  end if;
end;
$$;

-- ---------------------------------------------------------
-- K. 실행 권한 부여
-- ---------------------------------------------------------
grant execute on function public.contains_banned_word(text) to anon, authenticated;
grant execute on function public.assert_post_rate_limit(uuid) to anon, authenticated;
grant execute on function public.create_post(uuid, text, text, text, public.author_name_type) to anon, authenticated;
grant execute on function public.add_post_image(uuid, text, int) to anon, authenticated;
grant execute on function public.delete_post_image(uuid) to anon, authenticated;
grant execute on function public.publish_post(uuid) to anon, authenticated;
grant execute on function public.delete_post_hard(uuid) to anon, authenticated;
grant execute on function public.update_post(uuid, text, text) to anon, authenticated;
grant execute on function public.soft_delete_post(uuid) to anon, authenticated;
grant execute on function public.record_post_view(uuid) to anon, authenticated;
