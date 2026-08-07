-- =========================================================
-- 0067_planner_photo_flag.sql (W-064)
-- 설계사 프로필 사진 심사 플래그. /planner-register가 "실명·소속·연락처는
-- 공개되지 않습니다"를 약속하는데, 필드만 비공개일 뿐 프로필 사진 이미지 안에
-- 그 정보가 그대로 담겨 있어도 아무도 검사하지 않던 구멍을 메운다.
-- W-060(최상급 표현)과 같은 방식 - 하드 차단이 아니라 관리자 심사 플래그다.
-- =========================================================

alter table public.planner_profiles
  add column if not exists photo_flagged boolean not null default false,
  add column if not exists photo_flag_reason text;

-- 공개 뷰에서 플래그된 사진의 URL을 원천 차단한다 - 이 뷰를 쓰는 모든 화면
-- (검색/상세/카드)이 코드 수정 없이 즉시 "사진 없음" 상태로 폴백된다
-- (PlannerCard.tsx 등 기존 컴포넌트가 이미 profilePhotoUrl null을 그라디언트
-- 아바타로 처리하고 있었다 - SPEC-016 ⑩).
create or replace view public.public_planner_profiles as
select
  p.id,
  case when p.photo_flagged then null else p.profile_photo_path end as profile_photo_path,
  p.active_region_id,
  p.career_years,
  p.specialties,
  p.self_introduction,
  p.currently_employed,
  p.job_search_status,
  p.desired_start_timing,
  p.contactable_times,
  p.desired_region_id,
  p.desired_ga_company_id,
  p.desired_conditions,
  p.created_at,
  coalesce(badge_agg.badges, '[]'::jsonb) as badges,
  (exists (
    select 1 from planner_badges b
    where b.planner_profile_id = p.id and b.badge_type_code = 'income_verified' and b.status = 'approved'
  )) as has_income_verified,
  (exists (
    select 1 from planner_badges b
    where b.planner_profile_id = p.id and b.badge_type_code = 'top_planner' and b.status = 'approved'
  )) as has_top_planner
from planner_profiles p
left join lateral (
  select jsonb_agg(jsonb_build_object('code', bt.code, 'label', bt.label, 'icon', bt.icon) order by bt.sort_order) as badges
  from planner_badges b
  join planner_badge_types bt on bt.code = b.badge_type_code
  where b.planner_profile_id = p.id and b.status = 'approved'
) badge_agg on true
where p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

-- ---------------------------------------------------------
-- 관리자 전용 - 사진 심사 플래그 설정/해제
-- ---------------------------------------------------------
create or replace function public.admin_set_planner_photo_flag(p_profile_id uuid, p_flagged boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then
    raise exception 'NOT_ADMIN';
  end if;

  if p_flagged and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  update public.planner_profiles
  set photo_flagged = p_flagged, photo_flag_reason = case when p_flagged then trim(p_reason) else null end
  where id = p_profile_id;

  insert into public.audit_logs (admin_id, target_type, target_id, action, reason_detail, after_value)
  values (
    v_admin_id, 'planner_profile_photo', p_profile_id,
    case when p_flagged then 'photo_flagged' else 'photo_unflagged' end,
    p_reason, jsonb_build_object('flagged', p_flagged)
  );
end;
$$;

revoke all on function public.admin_set_planner_photo_flag(uuid, boolean, text) from public;
grant execute on function public.admin_set_planner_photo_flag(uuid, boolean, text) to authenticated;
