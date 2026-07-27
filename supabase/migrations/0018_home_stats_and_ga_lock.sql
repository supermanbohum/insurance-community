-- =========================================================
-- 0018_home_stats_and_ga_lock.sql
-- 1) "이달의 인기지점" TOP30 - branch_views(RLS로 비공개)를 월별로 집계해
--    공개적으로 안전하게 노출하는 함수(개별 조회 기록이 아니라 합계만 반환).
-- 2) 커뮤니티 "실시간 후기" 게시판 카테고리 추가.
-- 3) GA 마스터 데이터 보호 - register_branch_for_partner가 존재하지 않는 GA명이
--    들어오면 새로 만들지 않고 에러를 낸다. GA 목록은 관리자가 관리하는 고정
--    마스터 데이터여야 하는데, 지금까지는 파트너가 입력한 이름이 DB에 없으면
--    그 자리에서 새 ga_company를 만들어버려 "보험은역시오윤석" 같은 테스트/오타
--    이름이 그대로 GA 선택 목록에 섞여 들어가는 문제가 있었다.
--
-- 0008, 0014 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- 1) 이달의 인기지점 TOP N (조회수 기준, 이번 달)
-- ---------------------------------------------------------
create or replace function public.list_monthly_top_branches(p_limit int default 30)
returns table (branch_id uuid, view_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.branch_id, count(*) as view_count
  from public.branch_views v
  join public.ga_branch b on b.id = v.branch_id
  join public.ga_company c on c.id = b.ga_company_id
  where v.created_at >= date_trunc('month', now())
    and b.status = 'visible'
    and c.approval_status = 'approved'
  group by v.branch_id
  order by view_count desc
  limit p_limit;
$$;

grant execute on function public.list_monthly_top_branches(int) to anon, authenticated;

-- ---------------------------------------------------------
-- 2) 커뮤니티 "후기" 카테고리
-- ---------------------------------------------------------
insert into public.categories (slug, name, description, admin_only_write, sort_order)
values ('review', '이용후기', 'GA/지점 이용 후기', false, 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------
-- 3) GA 마스터 데이터 보호 - 존재하지 않는 GA명이면 생성하지 않고 에러.
-- ---------------------------------------------------------
create or replace function public.register_branch_for_partner(
  p_ga_name text,
  p_branch_slug text,
  p_branch_name text,
  p_region_id uuid,
  p_manager_name text,
  p_address text,
  p_address_detail text,
  p_intro_text text default null,
  p_planner_count int default null,
  p_parking_available boolean default null,
  p_visit_consult_available boolean default null,
  p_business_hours text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_tagline text default null,
  p_new_recruit_training boolean default null,
  p_experienced_hire boolean default null,
  p_db_support boolean default null,
  p_settlement_support boolean default null
)
returns table (ga_company_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_company public.ga_company;
  v_company_id uuid;
  v_ga_name text;
  v_branch_id uuid;
  v_branch_status text;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if v_admin.ga_company_id is not null then
    raise exception 'ALREADY_HAS_COMPANY';
  end if;

  v_ga_name := trim(p_ga_name);
  if v_ga_name = '' or length(trim(p_branch_name)) = 0 or length(trim(p_address)) = 0
     or length(trim(p_branch_slug)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_company from public.ga_company where name = v_ga_name;
  if v_company.id is null then
    -- GA는 관리자가 관리하는 고정 마스터 데이터다 - 목록에 없는 이름으로는 등록할 수 없다.
    raise exception 'GA_NOT_FOUND';
  end if;
  v_company_id := v_company.id;

  -- 이미 승인된 GA 아래에 (다른 담당자가) 새 지점을 추가하는 경우는 관리자 재검토 전까지 비공개.
  v_branch_status := case when v_company.approval_status = 'approved' then 'hidden' else 'visible' end;

  insert into public.ga_branch (
    ga_company_id, region_id, slug, name, manager_name, address, address_detail,
    intro_text, planner_count, parking_available, visit_consult_available, business_hours,
    operation_type, is_headquarters, status, lat, lng,
    tagline, new_recruit_training, experienced_hire, db_support, settlement_support
  ) values (
    v_company_id, p_region_id, trim(p_branch_slug), trim(p_branch_name), nullif(trim(coalesce(p_manager_name, '')), ''),
    trim(p_address), nullif(trim(coalesce(p_address_detail, '')), ''),
    nullif(trim(coalesce(p_intro_text, '')), ''), p_planner_count, p_parking_available, p_visit_consult_available,
    nullif(trim(coalesce(p_business_hours, '')), ''), 'branch', false, v_branch_status, p_lat, p_lng,
    nullif(trim(coalesce(p_tagline, '')), ''), p_new_recruit_training, p_experienced_hire, p_db_support, p_settlement_support
  ) returning id into v_branch_id;

  update public.ga_admin_users
  set ga_company_id = v_company_id, branch_id = v_branch_id, updated_at = now()
  where id = v_admin.id;

  return query select v_company_id, v_branch_id;
end;
$$;

grant execute on function public.register_branch_for_partner(
  text, text, text, uuid, text, text, text, text, int, boolean, boolean, text, double precision, double precision,
  text, boolean, boolean, boolean, boolean
) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 직접 검증)
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'list_monthly_top_branches';
-- select slug, name from public.categories where slug = 'review';
