-- =========================================================
-- 0026_pending_photo_link.sql
-- 기존 승인된 지점을 파트너가 수정할 때 새로 올리는 사진을 승인 대기 상태로
-- 표시하는 RPC. add_branch_media(0021/0023)의 시그니처는 그대로 두고(기존
-- 호출부 - 특히 신규 등록 플로우 - 를 건드리지 않기 위해) 업로드 직후 별도
-- 호출로 pending_registration_id만 채운다.
--
-- 0023 적용 후 실행.
-- =========================================================

create or replace function public.set_media_pending_registration(
  p_media_id uuid,
  p_registration_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_reg public.branch_registrations;
begin
  select branch_id into v_branch_id from public.branch_media where id = p_media_id;
  if v_branch_id is null then
    raise exception 'MEDIA_NOT_FOUND';
  end if;
  if not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null or v_reg.branch_id <> v_branch_id or v_reg.status <> 'pending' then
    raise exception 'INVALID_REGISTRATION';
  end if;

  update public.branch_media set pending_registration_id = p_registration_id where id = p_media_id;
end;
$$;

grant execute on function public.set_media_pending_registration(uuid, uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'set_media_pending_registration';
