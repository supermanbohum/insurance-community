-- =========================================================
-- 0099_branch_main_photo_up_to_three.sql
-- 지점 등록 폼 개편 ① - 대표 홍보사진을 1장에서 최대 3장까지 허용한다(오너 지시).
--
-- 대표 홍보사진 = 메인·지도·우수GA·인기GA·신규GA 등 목록성 화면에 나가는 사진이고,
-- 사무실 사진(image_office)과는 쓰임이 다르다. 지금은 정확히 1장만 허용된다.
--
-- 🔴 아래 함수는 0021 파일의 설명("첫 이미지=main, 나머지=office로 자동 배정")과
-- 다르다 - 그 뒤 어느 시점에 "호출부가 타입을 명시하고, image_main은 유일성 검사로
-- 막는" 방식으로 교체됐다. 이 마이그레이션은 파일이 아니라 **운영 DB의 현재 정의**
-- (pg_get_functiondef)를 원본으로 삼아 그대로 옮기고 필요한 곳만 고쳤다.
-- 파일 주석을 믿고 고쳤으면 존재하지 않는 로직을 수정할 뻔했다.
--
-- 바뀐 곳은 두 군데뿐이다:
--   1) image_main 유일성 검사(exists) → 3장 상한 검사(count >= 3)
--   2) image_main의 sort_order를 항상 0으로 두던 것 → 대표들 사이에서 0,1,2로 증가
--      (여러 장이 전부 0이면 목록에서 어느 게 첫 장인지 정할 수 없다)
-- 나머지 줄은 현재 정의 그대로다.
-- =========================================================

create or replace function public.add_branch_media(
  p_branch_id uuid,
  p_media_type branch_media_type,
  p_source branch_media_source,
  p_value text,
  p_sort_order integer default null::integer
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_media_id uuid;
  v_final_sort_order int;
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_value)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_media_type = 'image_main' then
    -- 대표 홍보사진은 최대 3장. 예외명을 MAIN_PHOTO_ALREADY_EXISTS에서 바꾼 이유는
    -- 이제 "이미 있다"가 아니라 "상한을 넘었다"가 실제 사유이기 때문이다 -
    -- 화면이 사용자에게 보여줄 문구도 달라진다.
    if (
      select count(*) from public.branch_media
      where branch_id = p_branch_id and media_type = 'image_main'
    ) >= 3 then
      raise exception 'MAIN_PHOTO_LIMIT_EXCEEDED';
    end if;
    select coalesce(max(sort_order) + 1, 0) into v_final_sort_order
    from public.branch_media
    where branch_id = p_branch_id and media_type = 'image_main';
  elsif p_media_type = 'image_office' then
    select coalesce(max(sort_order) + 1, 1) into v_final_sort_order
    from public.branch_media
    where branch_id = p_branch_id and media_type = 'image_office';
  else
    v_final_sort_order := coalesce(p_sort_order, 0);
  end if;

  insert into public.branch_media (branch_id, media_type, source, value, sort_order)
  values (p_branch_id, p_media_type, p_source, p_value, v_final_sort_order)
  returning id into v_media_id;

  return v_media_id;
end;
$function$;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select branch_id, media_type, sort_order from public.branch_media
-- where media_type = 'image_main' order by branch_id, sort_order;
