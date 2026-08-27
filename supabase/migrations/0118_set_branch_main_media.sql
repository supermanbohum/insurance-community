-- 0118 · 이미 올린 사진 중 하나를 대표사진으로 지정한다
--
-- 오너 지시(2026-08-27): 「시흥시청 대표사진은 사무실사진중 아무거나 대표로 올려」 → 「모두 해줘」
--
-- 🔴 왜 필요한가: 지금 대표사진은 **업로드 순서로만** 정해진다.
--    `BranchMediaTab` 문구 그대로 — 「가장 먼저 업로드한 사진이 자동으로 대표사진이 됩니다.
--    대표사진을 삭제하면 다음 사진이 대표사진이 됩니다.」
--    즉 **바꾸려면 지우는 수밖에 없다.** 실제로 컴패니언 7곳은 사무실사진만 있고 대표가 0장이라
--    상세 상단이 자리표시로 나왔고, CTO가 DB를 직접 고쳐서 해결했다.
--    같은 요청이 또 오면 또 부른다 — 그래서 **당사자가 화면에서 하게** 만든다.
--
-- 권한: 운영팀 또는 그 지점을 관리할 수 있는 사람(지점장·회사대표·매니저).
--       판정은 is_ga_admin_for_branch 하나로 통일한다 — 판정이 두 군데면 어긋난다(0115 교훈).

create or replace function public.set_branch_main_media(p_media_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_branch_id uuid;
  v_type      text;
begin
  select branch_id, media_type into v_branch_id, v_type
  from public.branch_media where id = p_media_id;

  if v_branch_id is null then
    raise exception 'MEDIA_NOT_FOUND';
  end if;

  -- 동영상은 대표사진이 될 수 없다
  if v_type not in ('image_main', 'image_office') then
    raise exception 'NOT_AN_IMAGE';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  -- 기존 대표사진은 일반 사무실사진으로 내린다(삭제하지 않는다)
  update public.branch_media
  set media_type = 'image_office'
  where branch_id = v_branch_id and media_type = 'image_main' and id <> p_media_id;

  update public.branch_media
  set media_type = 'image_main', sort_order = 0
  where id = p_media_id;

  perform public._write_ga_audit_log(
    'ga_branch', v_branch_id, 'set_main_media',
    null, jsonb_build_object('media_id', p_media_id)
  );
end;
$function$;

-- 🔴 RLS 정책이 이 함수를 부르지 않는 것을 pg_policies 로 확인한 뒤 좁힌다.
--    RLS가 부르는 함수의 anon 권한을 빼면 공개 페이지가 죽는다(2026-08-24에 실제로 그랬다).
revoke execute on function public.set_branch_main_media(uuid) from public, anon;
grant  execute on function public.set_branch_main_media(uuid) to authenticated;
