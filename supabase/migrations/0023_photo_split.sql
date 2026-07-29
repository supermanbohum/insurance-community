-- =========================================================
-- 0023_photo_split.sql
-- 대표사진(정확히 1장)과 사무실사진(최소 3장)을 명시적으로 분리된 슬롯으로 바꾼다.
--
-- 배경: 0021은 "첫 업로드 = 대표사진"을 서버가 자동으로 정해주는 방식이었다
-- (명시적 "대표사진 지정" UI가 없었음). 이번 기획은 정반대로 대표사진 전용
-- 업로드 영역을 요구한다 - 호출자가 "이건 대표사진이다"를 명시하고, 서버는
-- 지점당 대표사진이 하나만 존재하도록 유일성만 강제한다. 대표사진 교체는
-- 삭제 후 재업로드로 처리한다(0010 스토리지 정책의 "update 없음" 원칙과 동일).
--
-- 0022 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. 하드 가드 - 지점당 image_main은 최대 1개.
--    (0021에서 이미 지점당 하나만 남도록 정리했으므로 바로 유일성 인덱스를 걸 수 있다)
-- ---------------------------------------------------------
create unique index if not exists idx_branch_media_one_main
  on public.branch_media(branch_id)
  where media_type = 'image_main';

-- ---------------------------------------------------------
-- B. add_branch_media 재정의 - "첫 업로드 자동 승격"을 폐지하고 "호출자가
--    명시한 슬롯을 서버가 검증"하는 방식으로 바꾼다.
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
  v_final_sort_order int;
begin
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_value)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_media_type = 'image_main' then
    if exists (select 1 from public.branch_media where branch_id = p_branch_id and media_type = 'image_main') then
      raise exception 'MAIN_PHOTO_ALREADY_EXISTS';
    end if;
    v_final_sort_order := 0;
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
$$;

-- ---------------------------------------------------------
-- C. delete_branch_media 재정의 - 대표사진 삭제 시 자동 승격하지 않는다.
--    "정확히 1장" 슬롯은 파트너가 명시적으로 다시 채워야 하는 필수값이므로,
--    사무실사진이 임의로 대표사진이 되면 안 된다(등록 승인 조건에서도 대표사진
--    유무를 별도로 검사한다 - 0022의 review_branch_registration 참고).
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
begin
  select branch_id, value into v_branch_id, v_value
  from public.branch_media where id = p_media_id;

  if v_branch_id is null then
    raise exception 'MEDIA_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.branch_media where id = p_media_id;

  return v_value;
end;
$$;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 직접 검증)
-- ---------------------------------------------------------
-- select branch_id, count(*) from public.branch_media where media_type = 'image_main' group by branch_id having count(*) > 1;
-- (0건이어야 정상)
