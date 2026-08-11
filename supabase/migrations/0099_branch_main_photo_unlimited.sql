-- =========================================================
-- 0099_branch_main_photo_unlimited.sql
--
-- ⚠️ 작성 후 사양 변경(오너 지시)으로 적용 전 재작성했다. 적용 이력 없음 -
-- pg_proc으로 운영 함수에 MAIN_PHOTO_ALREADY_EXISTS가 그대로 남아 있는 것을 확인했다
-- (즉 이 파일의 이전 내용은 어느 DB에도 반영되지 않았다). 「기존 마이그레이션 불변」
-- 규칙의 목적이 파일과 DB의 괴리 방지인데, 괴리가 생길 대상 자체가 없어 새 번호로
-- 즉시 뒤집는 것보다 이 자리에서 고치는 편이 이력이 깨끗하다.
--
-- 지점 등록 폼 개편 ① - 대표 홍보사진을 여러 장 허용한다.
--   변경 전 사양   1~3장 (상한 3)
--   최종 사양      1장 이상, 상한 없음   ← 오너가 상한을 전부 없앴다
--
-- 대표 홍보사진 = 메인·지도·우수GA·인기GA·신규GA 목록에 나가는 사진이다.
-- 현재 운영 함수는 image_main이 이미 있으면 MAIN_PHOTO_ALREADY_EXISTS로 막아 정확히
-- 1장만 허용한다. 그 검사를 제거한다.
--
-- 🔴 상한 검사를 넣지 않는다. 던질 일이 없는 예외를 남기면 화면 쪽에서 그 문구를
-- 계속 관리해야 하므로 MAIN_PHOTO_LIMIT_EXCEEDED도 만들지 않는다.
--
-- 🔴 sort_order를 0 고정에서 증가로 바꾼다. 여러 장이 전부 0이면 "첫 장"을 정할 수
-- 없는데, 카드 자리(메인·지도·우수GA 등)는 하나뿐이라 첫 장을 확정해야 한다.
--   카드류      sort_order가 가장 작은 1장만 사용
--   지점 상세    전체를 순회
-- 이 규칙 덕분에 대표 사진 장수에 상한이 없어도 목록 레이아웃이 깨지지 않는다.
--
-- image_office 쪽은 손대지 않는다(현행 coalesce(max+1, 1) 유지).
--
-- 함수 본문은 파일이 아니라 운영 DB의 현재 정의(pg_get_functiondef)를 그대로 옮기고
-- 위 두 곳만 고쳤다 - 0021 파일 주석("첫 이미지=main 자동 배정")은 실제 운영 함수와
-- 달랐다. 파일을 믿었으면 존재하지 않는 로직을 고칠 뻔했다.
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
    -- 장수 제한 없음. 호출부가 지정한 타입을 그대로 신뢰한다.
    -- 카드류가 쓸 "첫 장"을 정할 수 있도록 0,1,2…로 증가시킨다.
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
-- 확인 쿼리 - 적용 후 원문으로 확인한다.
--   기대: MAIN_PHOTO_ALREADY_EXISTS 없음, image_main도 coalesce(max+1, 0)
-- ---------------------------------------------------------
-- select pg_get_functiondef(oid) from pg_proc where proname = 'add_branch_media';
