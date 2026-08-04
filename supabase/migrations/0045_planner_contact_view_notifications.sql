-- =========================================================
-- 0045_planner_contact_view_notifications.sql
-- 설계사 열람 알림(item 18) - GA가 get_planner_contact()(0036)로 연락처를 열람(=크레딧
-- 최초 차감)하면 해당 설계사에게 실시간으로 알 수 있는 알림을 남긴다.
--
--   - 최초 열람 시에만 알림 발송(0036의 unlock unique 제약을 그대로 재사용해 멱등)
--   - 열람한 GA 관리자가 특정 지점 소속이면(ga_admin_users.branch_id) 지점명 노출,
--     아니면 "리쿠르터"로만 익명 표시
--   - 앱 출시 후 실시간 Push로 확장 가능하도록 별도 테이블로 분리(알림 종류가
--     늘어나도 이 테이블/RPC 패턴을 그대로 복제하면 됨)
--
-- 0036 적용 후 실행.
-- =========================================================

create table public.planner_contact_view_notifications (
  id uuid primary key default gen_random_uuid(),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  ga_company_id uuid not null references public.ga_company(id),
  -- 열람한 GA 관리자가 특정 지점에 소속돼 있을 때만 채워진다(없으면 익명 "리쿠르터"로 노출).
  viewer_branch_id uuid references public.ga_branch(id),
  viewed_by_ga_admin_id uuid not null references public.ga_admin_users(id),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index idx_planner_contact_view_notifications_profile
  on public.planner_contact_view_notifications(planner_profile_id, created_at desc);

alter table public.planner_contact_view_notifications enable row level security;

-- 본인(설계사) 것만 조회 가능. 쓰기는 get_planner_contact 내부(security definer)에서만.
create policy "planner reads own contact view notifications"
  on public.planner_contact_view_notifications for select
  using (
    exists (
      select 1 from public.planner_profiles p
      where p.id = planner_contact_view_notifications.planner_profile_id
        and p.user_id = public.current_member_id()
    )
  );

-- ---------------------------------------------------------
-- get_planner_contact 재정의 - 최초 언락(v_unlock_id가 이 트랜잭션에서 새로 생성됐을
-- 때)에만 알림 행을 추가한다. 그 외 로직은 0036과 동일하다.
-- ---------------------------------------------------------
create or replace function public.get_planner_contact(p_planner_profile_id uuid)
returns table (name text, phone text, email text, kakao_id text)
language plpgsql
security definer
set search_path = public
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
      -- 이 트랜잭션이 언락을 선점했을 때만 차감한다.
      update public.planner_market_credit_balances
        set balance = balance - 1, updated_at = now()
        where ga_company_id = v_admin.ga_company_id and balance >= 1;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'INSUFFICIENT_CREDITS'; -- 방금 만든 unlock insert까지 함께 롤백된다.
      end if;
      v_first_time_unlock := true;
    else
      -- 동시 요청 중 다른 트랜잭션이 먼저 언락을 완료함 - 과금 없이 통과. 알림도 이미
      -- 먼저 열람한 트랜잭션에서 발송됐으므로 여기서는 또 보내지 않는다("같은 회원이
      -- 다시 열람해도 알림 재발송 없음"과 동일한 멱등 원칙).
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

  return query select v_profile.name, v_profile.phone, v_profile.email, v_profile.kakao_id;
end;
$$;

grant execute on function public.get_planner_contact(uuid) to authenticated;

-- ---------------------------------------------------------
-- 조회 RPC - 본인 설계사 프로필의 알림만. 지점 소속 열람이면 지점명/지역/GA/지점ID를
-- 함께 반환(클릭 시 지점 상세로 이동), 아니면 전부 null(익명 "리쿠르터"로만 표시).
-- ---------------------------------------------------------
create or replace function public.list_my_planner_contact_notifications()
returns table (
  id uuid,
  branch_id uuid,
  branch_slug text,
  branch_name text,
  branch_region_label text,
  ga_company_name text,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    b.id as branch_id,
    b.slug as branch_slug,
    b.name as branch_name,
    case when r.id is not null then
      r.sido_name || case when r.sigungu_name is not null then ' ' || r.sigungu_name else '' end
    else null end as branch_region_label,
    c.name as ga_company_name,
    n.created_at,
    n.read_at
  from public.planner_contact_view_notifications n
  join public.planner_profiles p on p.id = n.planner_profile_id
  left join public.ga_branch b on b.id = n.viewer_branch_id
  left join public.regions r on r.id = b.region_id
  left join public.ga_company c on c.id = n.ga_company_id
  where p.user_id = public.current_member_id()
  order by n.created_at desc
  limit 100;
$$;

grant execute on function public.list_my_planner_contact_notifications() to authenticated;

create or replace function public.count_my_unread_planner_contact_notifications()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.planner_contact_view_notifications n
  join public.planner_profiles p on p.id = n.planner_profile_id
  where p.user_id = public.current_member_id() and n.read_at is null;
$$;

grant execute on function public.count_my_unread_planner_contact_notifications() to authenticated;

create or replace function public.mark_my_planner_contact_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.planner_contact_view_notifications n
  set read_at = now()
  from public.planner_profiles p
  where n.planner_profile_id = p.id
    and p.user_id = public.current_member_id()
    and n.read_at is null;
end;
$$;

grant execute on function public.mark_my_planner_contact_notifications_read() to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select count(*) from public.planner_contact_view_notifications;
-- select proname from pg_proc where proname in (
--   'list_my_planner_contact_notifications','count_my_unread_planner_contact_notifications',
--   'mark_my_planner_contact_notifications_read'
-- );
