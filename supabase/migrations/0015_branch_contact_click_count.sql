-- =========================================================
-- 0015_branch_contact_click_count.sql
-- 지점 카드에 "문의수"를 공개적으로 보여주기 위한 집계 컬럼 추가.
--
-- 배경: branch_contact_clicks 원본 로그는 RLS로 해당 지점 GA 관리자만 조회할 수
-- 있어(개인 클릭 이력을 공개하지 않기 위함) 공개 페이지에서 직접 집계할 수 없다.
-- organic_view_count가 record_branch_view에서 바로 증가하는 것과 동일한 방식으로,
-- ga_branch에 카운터 컬럼을 두고 record_branch_contact_click에서 증가시킨다.
--
-- 0008 적용 후 실행.
-- =========================================================

alter table public.ga_branch add column if not exists contact_click_count int not null default 0;

create or replace function public.record_branch_contact_click(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_type text;
begin
  select branch_id, type into v_branch_id, v_type from public.branch_contacts where id = p_contact_id;

  if v_branch_id is null then
    raise exception 'CONTACT_NOT_FOUND';
  end if;

  insert into public.branch_contact_clicks (branch_id, contact_id, contact_type)
  values (v_branch_id, p_contact_id, v_type);

  update public.ga_branch
  set contact_click_count = contact_click_count + 1
  where id = v_branch_id;
end;
$$;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 사용자가 직접 검증)
-- ---------------------------------------------------------
-- select column_name from information_schema.columns where table_name = 'ga_branch' and column_name = 'contact_click_count';
