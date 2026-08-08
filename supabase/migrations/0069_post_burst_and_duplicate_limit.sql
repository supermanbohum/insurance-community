-- =========================================================
-- 0069_post_burst_and_duplicate_limit.sql
-- W-072(CT-022) - 도배 방지 규칙 확장. 콘텐츠팀 제안 수치를 그대로 적용한다.
--   ① 최소 작성 간격을 60초 -> 30초로 조정(연타/봇 차단에는 충분, 정상 사용자는
--      30초 안에 글 2건을 쓸 일이 없다는 게 콘텐츠팀 판단).
--   ② 10분 내 5건 초과 시 차단(신규) - 순간 폭주형 도배를 잡는다. 별도 상태 컬럼 없이
--      "최근 10분 내 작성 수"를 매번 세는 롤링 윈도우 방식이라, 5번째 글이 10분 밖으로
--      밀려나면 자연히 다시 쓸 수 있게 된다(고정 10분 쿨다운과 실질적으로 동등하되
--      구현이 단순하다).
--   ③ 직전 자기 글과 본문이 완전히 같으면 즉시 차단(신규) - 콘텐츠팀 표현대로
--      "오탐 가능성이 구조적으로 0인 유일한 규칙"이라 가장 먼저, 가장 강하게 검사한다.
-- 0004 적용 후 실행.
-- =========================================================

update public.site_settings set value = '30' where key = 'post_rate_limit_seconds';

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
  v_last_post_content text;
  v_today_count int;
  v_burst_count int;
begin
  select (value)::int into v_rate_limit_seconds from public.site_settings where key = 'post_rate_limit_seconds';
  select (value)::int into v_daily_limit from public.site_settings where key = 'post_daily_limit';

  select created_at, content into v_last_post_at, v_last_post_content
  from public.posts
  where author_id = p_profile_id and deleted_at is null
  order by created_at desc
  limit 1;

  if v_last_post_at is not null
     and v_last_post_at > now() - make_interval(secs => coalesce(v_rate_limit_seconds, 30)) then
    raise exception 'RATE_LIMITED';
  end if;

  select count(*) into v_burst_count
  from public.posts
  where author_id = p_profile_id
    and created_at > now() - interval '10 minutes'
    and deleted_at is null;

  if v_burst_count >= 5 then
    raise exception 'BURST_LIMITED';
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

-- 본문 중복 검사는 create_post() 쪽에서 content 파라미터가 필요해 별도 함수로 둔다
-- (assert_post_rate_limit은 profile_id만 받는 기존 시그니처를 그대로 유지).
create or replace function public.assert_post_not_duplicate(p_profile_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_content text;
begin
  select content into v_last_content
  from public.posts
  where author_id = p_profile_id and deleted_at is null
  order by created_at desc
  limit 1;

  if v_last_content is not null and v_last_content = p_content then
    raise exception 'DUPLICATE_CONTENT';
  end if;
end;
$$;

grant execute on function public.assert_post_not_duplicate(uuid, text) to anon, authenticated;

-- create_post() 재정의 - 0004 원본에서 assert_post_not_duplicate 호출 한 줄만 추가한다
-- (나머지는 바이트 단위로 동일).
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
  perform public.assert_post_not_duplicate(v_profile_id, p_content);

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
-- 확인 쿼리
-- ---------------------------------------------------------
-- select key, value from site_settings where key = 'post_rate_limit_seconds';
-- select proname from pg_proc where proname in ('assert_post_rate_limit','assert_post_not_duplicate');
