-- =========================================================
-- 0068_planner_photo_gating.sql (W-064 v2 - 오너 직접 지시)
-- 사진 심사(반려) 방식(0067)을 대체한다 - 구조적으로 공개 뷰에서 사진을 아예
-- 내보내지 않고, 기존 열람권(get_planner_contact) 언락 시에만 경로를 반환한다.
-- 새 권한 체계를 만들지 않고 planner_market_credit_unlocks에 그대로 얹는다.
-- 0067의 photo_flagged 컬럼/관리자 UI는 남겨둔다(추가 안전장치로 무해함).
--
-- 뷰의 컬럼 목록이 바뀌므로 create or replace view로는 안 되고 drop 후
-- 재생성해야 한다(dependent view 없음을 pg_depend로 사전 확인).
-- =========================================================

drop view public.public_planner_profiles;

create view public.public_planner_profiles as
select
  p.id,
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

-- 기존 연락처 언락 RPC에 사진 경로도 함께 반환하도록 확장한다 - 원자적 언락/크레딧
-- 차감/중복방지/알림 로직은 전혀 건드리지 않고 반환 컬럼만 늘린다. 반환 타입이
-- 바뀌므로 create or replace로는 안 되고 drop 후 재생성해야 한다.
drop function public.get_planner_contact(uuid);

create function public.get_planner_contact(p_planner_profile_id uuid)
returns table(name text, phone text, email text, kakao_id text, profile_photo_path text)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_admin public.ga_admin_users;
  v_profile public.planner_profiles;
  v_unlock_id uuid;
  v_updated int;
  v_first_time_unlock boolean := false;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;

  select * into v_profile from public.planner_profiles where id = p_planner_profile_id;
  if v_profile.id is null or v_profile.status <> 'approved' or v_profile.withdrawn_at is not null then
    raise exception 'PROFILE_NOT_AVAILABLE';
  end if;
  if v_profile.contact_sharing_revoked_at is not null then
    raise exception 'CONTACT_SHARING_REVOKED';
  end if;

  select id into v_unlock_id from public.planner_market_credit_unlocks
    where ga_company_id = v_admin.ga_company_id and planner_profile_id = p_planner_profile_id;

  if v_unlock_id is null then
    insert into public.planner_market_credit_unlocks (ga_company_id, planner_profile_id, unlocked_by_ga_admin_id)
    values (v_admin.ga_company_id, p_planner_profile_id, v_admin.id)
    on conflict (ga_company_id, planner_profile_id) do nothing
    returning id into v_unlock_id;

    if v_unlock_id is not null then
      update public.planner_market_credit_balances
        set balance = balance - 1, updated_at = now()
        where ga_company_id = v_admin.ga_company_id and balance >= 1;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'INSUFFICIENT_CREDITS';
      end if;
      v_first_time_unlock := true;
    else
      select id into v_unlock_id from public.planner_market_credit_unlocks
        where ga_company_id = v_admin.ga_company_id and planner_profile_id = p_planner_profile_id;
    end if;
  end if;

  if v_first_time_unlock then
    insert into public.planner_contact_view_notifications (
      planner_profile_id, ga_company_id, viewer_branch_id, viewed_by_ga_admin_id
    ) values (
      p_planner_profile_id, v_admin.ga_company_id, v_admin.branch_id, v_admin.id
    );
  end if;

  return query select v_profile.name, v_profile.phone, v_profile.email, v_profile.kakao_id, v_profile.profile_photo_path;
end;
$$;

grant execute on function public.get_planner_contact(uuid) to anon, authenticated;
