-- =========================================================
-- 0063_official_post_publishing.sql (W-027)
-- 운영팀 공식 발행 기능 - 관리자가 "보험맵 운영팀" 명의로 커뮤니티에 글을 올린다.
-- posts.author_id는 not null이고 anonymous_profiles를 가리키는데, 관리자 로그인은
-- 익명 세션과 별개의 auth.uid()라 보통 대응하는 anonymous_profiles 행이 없다 -
-- 최초 발행 시 하나 만들어 재사용한다(signup_ga_admin의 get-or-create 패턴과 동일).
-- =========================================================

alter table public.posts add column if not exists source_url text;
comment on column public.posts.source_url is '운영팀 공식 게시물의 출처 링크(선택). 일반 회원 글에는 쓰이지 않는다.';

create or replace function public.admin_create_post(
  p_category_id uuid,
  p_title text,
  p_content text,
  p_source_url text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_admin_id uuid;
  v_profile_id uuid;
  v_post_id uuid;
begin
  v_admin_id := public.current_admin_id();
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if not exists (select 1 from public.categories where id = p_category_id and is_active = true) then
    raise exception 'INVALID_CATEGORY';
  end if;

  select id into v_profile_id from public.anonymous_profiles where auth_user_id = auth.uid();
  if v_profile_id is null then
    insert into public.anonymous_profiles (auth_user_id, last_author_name)
    values (auth.uid(), '보험맵 운영팀')
    returning id into v_profile_id;
  end if;

  insert into public.posts (
    category_id, author_id, author_admin_id, title, content, author_display_name, author_name_type,
    status, is_seo_indexable, source_url
  ) values (
    p_category_id, v_profile_id, v_admin_id, p_title, p_content, '보험맵 운영팀', 'admin',
    'visible', true, nullif(trim(coalesce(p_source_url, '')), '')
  ) returning id into v_post_id;

  insert into public.audit_logs (admin_id, action, target_type, target_id, after_value)
  values (v_admin_id, 'create_official_post', 'post', v_post_id, jsonb_build_object('title', p_title, 'category_id', p_category_id));

  return v_post_id;
end;
$$;

grant execute on function public.admin_create_post(uuid, text, text, text) to authenticated;
