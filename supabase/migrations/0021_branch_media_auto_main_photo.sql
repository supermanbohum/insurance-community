-- =========================================================
-- 0021_branch_media_auto_main_photo.sql
-- 대표사진 정책 단순화 - "첫 번째로 업로드한 사진 = 대표사진"을 서버(RPC)가
-- 강제한다. 관리자/파트너가 대표사진을 따로 지정할 필요가 없어지고, 대표사진을
-- 삭제하면 다음 사진이 자동으로 대표사진이 된다.
--
-- 기존에는 호출부(관리자 화면/파트너 등록 폼)가 image_main/image_office를
-- 직접 선택해서 보냈는데, DB에 image_main 유일성 제약이 없어 파트너의
-- "대표 이미지 교체" 버튼이 매번 새 image_main을 추가만 해서 지점 하나에
-- image_main이 여러 장 쌓이는 버그가 있었다. 아래에서 기존 데이터를 정리하고,
-- 앞으로는 add_branch_media/delete_branch_media가 이 정책을 직접 강제한다.
--
-- 0008 적용 후 실행.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1) 기존 데이터 정리 - 지점당 image_main이 여러 장이면 가장 먼저 업로드된
--    (sort_order, created_at 기준) 한 장만 남기고 나머지는 image_office로.
-- ---------------------------------------------------------
with ranked as (
  select id, branch_id,
    row_number() over (partition by branch_id order by sort_order asc, created_at asc) as rn
  from public.branch_media
  where media_type = 'image_main'
)
update public.branch_media m
set media_type = 'image_office'
from ranked r
where m.id = r.id and r.rn > 1;

-- ---------------------------------------------------------
-- 2) sort_order 재정렬 - 과거 관리자 업로드가 전부 sort_order=0으로 저장되어
--    업로드 순서가 보존되지 않던 문제를 함께 바로잡는다(대표사진이 항상 0번).
-- ---------------------------------------------------------
with ordered as (
  select id, branch_id,
    row_number() over (
      partition by branch_id
      order by case when media_type = 'image_main' then 0 else 1 end, sort_order asc, created_at asc
    ) - 1 as new_order
  from public.branch_media
  where media_type in ('image_main', 'image_office')
)
update public.branch_media m
set sort_order = o.new_order
from ordered o
where m.id = o.id;

-- ---------------------------------------------------------
-- 3) add_branch_media - 이미지(image_main/image_office)는 호출부가 보낸
--    media_type/sort_order를 힌트로만 받고, 실제 값은 "이 지점에 이미지가
--    하나도 없으면 image_main, 있으면 image_office"로 서버가 다시 계산한다.
--    영상(video)은 기존 그대로.
-- ---------------------------------------------------------
create or replace function public.add_branch_media(
  p_branch_id uuid,
  p_media_type public.branch_media_type,
  p_source public.branch_media_source,
  p_value text,
  p_sort_order int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media_id uuid;
  v_final_type public.branch_media_type := p_media_type;
  v_final_sort_order int;
  v_existing_image_count int;
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_value)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_media_type in ('image_main', 'image_office') then
    select count(*) into v_existing_image_count
    from public.branch_media
    where branch_id = p_branch_id and media_type in ('image_main', 'image_office');

    v_final_type := case when v_existing_image_count = 0 then 'image_main' else 'image_office' end;

    select coalesce(max(sort_order) + 1, 0) into v_final_sort_order
    from public.branch_media
    where branch_id = p_branch_id and media_type in ('image_main', 'image_office');
  else
    v_final_sort_order := coalesce(p_sort_order, 0);
  end if;

  insert into public.branch_media (branch_id, media_type, source, value, sort_order)
  values (p_branch_id, v_final_type, p_source, p_value, v_final_sort_order)
  returning id into v_media_id;

  return v_media_id;
end;
$$;

-- ---------------------------------------------------------
-- 4) delete_branch_media - 삭제되는 사진이 대표사진(image_main)이었다면, 남은
--    사진 중 가장 먼저 업로드된 것을 새 대표사진으로 자동 승격한다.
-- ---------------------------------------------------------
create or replace function public.delete_branch_media(p_media_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_value text;
  v_media_type public.branch_media_type;
  v_next_id uuid;
begin
  select branch_id, value, media_type into v_branch_id, v_value, v_media_type
  from public.branch_media where id = p_media_id;

  if v_branch_id is null then
    raise exception 'MEDIA_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.branch_media where id = p_media_id;

  if v_media_type = 'image_main' then
    select id into v_next_id
    from public.branch_media
    where branch_id = v_branch_id and media_type = 'image_office'
    order by sort_order asc, created_at asc
    limit 1;

    if v_next_id is not null then
      update public.branch_media set media_type = 'image_main' where id = v_next_id;
    end if;
  end if;

  return v_value;
end;
$$;

commit;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 직접 검증)
-- ---------------------------------------------------------
-- select branch_id, count(*) from public.branch_media where media_type = 'image_main' group by branch_id having count(*) > 1;
-- (0건이어야 정상 - 지점당 대표사진은 항상 하나)
