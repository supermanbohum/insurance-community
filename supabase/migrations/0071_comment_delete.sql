-- =========================================================
-- 0071_comment_delete.sql (W-078 범위 보완)
-- CTO가 정의한 W-078 범위는 "작성·표시·삭제"였는데 0070은 작성/표시까지만
-- 구현했다. 본인 댓글 삭제(soft delete)를 soft_delete_post() 패턴 그대로 추가한다.
-- 0070 적용 후 실행.
-- =========================================================

create or replace function public.soft_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
  v_was_visible boolean;
begin
  select post_id, status = 'visible' into v_post_id, v_was_visible
  from public.comments
  where id = p_comment_id and author_id = public.current_profile_id() and deleted_at is null;

  if v_post_id is null then
    raise exception 'NOT_COMMENT_OWNER';
  end if;

  update public.comments
  set status = 'deleted', deleted_at = now()
  where id = p_comment_id;

  if v_was_visible then
    update public.posts set organic_comment_count = greatest(0, organic_comment_count - 1) where id = v_post_id;
  end if;
end;
$$;

grant execute on function public.soft_delete_comment(uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'soft_delete_comment';
