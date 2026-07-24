-- =========================================================
-- 0011_delete_functions.sql
-- 관리자 전용 Branch/GA 삭제(소프트 삭제) 기능.
--
-- ga_branch 쪽은 이미 set_branch_status()가 'deleted' 값을 받아
-- deleted_at까지 세팅하도록 구현되어 있었다(0008). 다만 DB CHECK 제약이
-- 'visible'/'hidden'만 허용해 실제로는 호출하면 제약 위반으로 실패하는
-- 상태였다 - 이 마이그레이션에서 제약을 넓혀 완성한다.
-- ga_company 쪽은 상태 전용 함수가 없었으므로 set_ga_company_status()를
-- 새로 추가한다(삭제 시 소속 지점 전체도 함께 'deleted' 처리).
--
-- 완전 삭제(hard delete)가 아니라 status='deleted' 소프트 삭제다.
-- 연관 데이터(media/contacts/recruit 등)는 그대로 남지만, 부모가
-- 'deleted'가 되는 순간 기존 RLS 정책(부모 status='visible' 요구)에
-- 의해 공개 조회에서 자동으로 제외된다. 0007/0008 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. status CHECK 제약에 'deleted' 추가 (기존 제약 이름을 동적으로 찾아 교체)
-- ---------------------------------------------------------
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.ga_branch'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if con_name is not null then
    execute format('alter table public.ga_branch drop constraint %I', con_name);
  end if;
end $$;
alter table public.ga_branch add constraint ga_branch_status_check check (status in ('visible', 'hidden', 'deleted'));

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.ga_company'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if con_name is not null then
    execute format('alter table public.ga_company drop constraint %I', con_name);
  end if;
end $$;
alter table public.ga_company add constraint ga_company_status_check check (status in ('visible', 'hidden', 'deleted'));

-- ---------------------------------------------------------
-- B. ga_company에도 삭제 시각 기록용 컬럼 추가 (ga_branch는 0006에서 이미 존재)
-- ---------------------------------------------------------
alter table public.ga_company add column if not exists deleted_at timestamptz;

-- ---------------------------------------------------------
-- C. 삭제 전 연관 데이터 개수 확인용 함수 (관리자 화면의 확인 모달에서 사용)
-- ---------------------------------------------------------
create or replace function public.get_branch_delete_impact(p_branch_id uuid)
returns table (
  media_count bigint,
  contacts_count bigint,
  active_recruit_count bigint,
  view_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.branch_media where branch_id = p_branch_id),
    (select count(*) from public.branch_contacts where branch_id = p_branch_id),
    (select count(*) from public.branch_recruit where branch_id = p_branch_id and is_active = true),
    coalesce((select organic_view_count + imported_view_count + correction_view_count from public.ga_branch where id = p_branch_id), 0);
$$;

create or replace function public.get_ga_company_delete_impact(p_ga_company_id uuid)
returns table (
  branch_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.ga_branch where ga_company_id = p_ga_company_id and status != 'deleted';
$$;

grant execute on function public.get_branch_delete_impact(uuid) to authenticated;
grant execute on function public.get_ga_company_delete_impact(uuid) to authenticated;

-- ---------------------------------------------------------
-- D. ga_company 상태 전용 함수 (set_branch_status의 GA 버전).
--    삭제 시 소속 지점 전체를 함께 'deleted' 처리한다(부모 없는 지점 방지).
-- ---------------------------------------------------------
create or replace function public.set_ga_company_status(p_ga_company_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if p_status not in ('visible', 'hidden', 'deleted') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.ga_company
  set status = p_status, deleted_at = case when p_status = 'deleted' then now() else deleted_at end
  where id = p_ga_company_id;

  if not found then
    raise exception 'GA_COMPANY_NOT_FOUND';
  end if;

  if p_status = 'deleted' then
    update public.ga_branch
    set status = 'deleted', deleted_at = now()
    where ga_company_id = p_ga_company_id and status != 'deleted';
  end if;

  perform public._write_ga_audit_log('ga_company', p_ga_company_id, 'set_status', null, jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.set_ga_company_status(uuid, text) to authenticated;
