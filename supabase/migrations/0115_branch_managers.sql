-- 0115 · 지점 매니저 — 계정이 달라도 그 지점을 관리할 수 있게 한다
--
-- 사고(2026-08-24): 컴패니언 HQ 담당자가 사무실 사진 제출·대표 연락처 저장에서
--   「제출하지 못했습니다」 / 「접근 권한이 없습니다」를 맞았다.
--
-- 🔴 원인은 권한 설정이 아니라 **판정이 두 군데라 어긋난 것**이었다.
--   페이지 열기  branch.ga_company_id === partner.ga_company_id   회사 단위 → 열린다
--   저장         is_ga_admin_for_branch(branch_id)                 지점 단위 → 막힌다
--   그 계정은 ga_admin_users.branch_id 가 「송파사무실」 하나로 고정돼 있어서
--   같은 회사의 다른 사무실은 **폼은 열리는데 저장만 실패**했다.
--   사용자에게는 「되는 화면인데 버튼이 죽은 것」으로 보인다. 가장 나쁜 형태다.
--
-- 오너 지시: 「아이디 등록하면 계정이 달라도 해당 지점을 관리할 수 있는 매니저 직책」
--   → 사람이 바뀔 때마다 SQL 을 치는 건 해결이 아니다. **화면에서 등록하게 만든다.**
--
-- 권한 모델을 셋으로 정리한다
--   회사 대표   is_company_owner = true            그 회사의 모든 지점
--   지점장      branch_id = <지점>                  그 지점 하나
--   매니저      ga_branch_admins 에 행이 있는 지점   위임받은 지점들   ← 이번에 추가
--
-- ⚠️ 예전 규칙 「branch_id 가 null 이면 회사 전체」를 `is_company_owner` 로 바꾼다.
--    암묵적이라 위험했다 — 매니저 계정을 만들 때 branch_id 를 비우면
--    **의도치 않게 회사 전체 권한**이 붙는다. 그 지뢰를 지금 없앤다.
--    실측(2026-08-24): `ga_company_id is not null and branch_id is null` 인 활성 계정은 **0개**다.
--    그래서 이 변경으로 권한이 줄어드는 사람은 없다.

-- ── 1. 매니저 위임 표 ────────────────────────────────────────
create table if not exists public.ga_branch_admins (
  ga_admin_user_id uuid not null references public.ga_admin_users(id) on delete cascade,
  branch_id        uuid not null references public.ga_branch(id)      on delete cascade,
  granted_by_admin_id uuid references public.admin_users(id),
  created_at       timestamptz not null default now(),
  primary key (ga_admin_user_id, branch_id)
);

create index if not exists ga_branch_admins_branch_idx on public.ga_branch_admins (branch_id);

-- SECURITY DEFINER 함수로만 접근한다. 클라이언트에 직접 열지 않는다.
alter table public.ga_branch_admins enable row level security;

-- ── 2. 회사 대표 여부를 명시 컬럼으로 ────────────────────────
alter table public.ga_admin_users
  add column if not exists is_company_owner boolean not null default false;

-- 기존 의미(branch_id null + 회사 연결 = 회사 전체)를 그대로 옮긴다.
-- 실측상 해당 행은 0개라 no-op 이지만, 순서를 바꿔 실행해도 안전하도록 남겨 둔다.
update public.ga_admin_users
set is_company_owner = true
where ga_company_id is not null and branch_id is null and is_company_owner = false;

-- ── 3. 판정 함수 — 세 규칙을 한 곳에서 ───────────────────────
-- 🔴 이름·인자가 같으므로 기존 함수를 **대체**한다.
--    인자 개수를 바꾸면 함수가 하나 더 생겨 PostgREST 가 후보를 못 고른다(0108).
create or replace function public.is_ga_admin_for_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.ga_admin_users ga
    join public.ga_branch b on b.id = p_branch_id
    where ga.auth_user_id = auth.uid()
      and ga.is_active = true
      and (
        ga.branch_id = p_branch_id                                        -- 지점장
        or (ga.is_company_owner and ga.ga_company_id = b.ga_company_id)   -- 회사 대표
        or exists (                                                       -- 매니저
          select 1 from public.ga_branch_admins m
          where m.ga_admin_user_id = ga.id and m.branch_id = p_branch_id
        )
      )
  );
$function$;

revoke execute on function public.is_ga_admin_for_branch(uuid) from public, anon;
grant  execute on function public.is_ga_admin_for_branch(uuid) to authenticated;

-- ── 4. 내가 관리할 수 있는 지점 목록 ─────────────────────────
-- 파트너 화면이 「회사의 모든 지점」을 보여주던 것을 이걸로 바꾼다.
-- 화면과 저장이 같은 기준을 쓰게 하는 것이 이번 사고의 교훈이다.
create or replace function public.my_manageable_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select b.id
  from public.ga_branch b
  join public.ga_admin_users ga on ga.auth_user_id = auth.uid() and ga.is_active = true
  where b.deleted_at is null
    and (
      ga.branch_id = b.id
      or (ga.is_company_owner and ga.ga_company_id = b.ga_company_id)
      or exists (
        select 1 from public.ga_branch_admins m
        where m.ga_admin_user_id = ga.id and m.branch_id = b.id
      )
    );
$function$;

revoke execute on function public.my_manageable_branch_ids() from public, anon;
grant  execute on function public.my_manageable_branch_ids() to authenticated;

-- ── 5. 매니저 등록 / 해제 / 조회 (운영팀 전용) ───────────────

/**
 * 이메일로 계정을 찾아 그 지점의 매니저로 등록한다.
 * 🔴 계정이 없으면 만들어 주지 않는다 — 먼저 본인이 보험맵에 가입해야 한다.
 *    없는 사람을 위해 빈 계정을 만들어 두면 **주인 없는 관리 권한**이 생긴다.
 */
create or replace function public.grant_branch_manager(p_branch_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email        text := lower(btrim(coalesce(p_email, '')));
  v_auth_user_id uuid;
  v_admin_id     uuid;
  v_company_id   uuid;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if v_email = '' then
    raise exception 'INVALID_INPUT';
  end if;

  select ga_company_id into v_company_id from public.ga_branch where id = p_branch_id;
  if v_company_id is null then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  -- 이미 파트너 계정이 있으면 그걸 쓴다
  select id into v_admin_id from public.ga_admin_users where lower(email) = v_email;

  if v_admin_id is null then
    -- 보험맵 회원이긴 한가?
    select id into v_auth_user_id from auth.users where lower(email) = v_email;
    if v_auth_user_id is null then
      raise exception 'NO_SUCH_ACCOUNT';
    end if;

    -- 매니저용 파트너 계정을 만든다.
    -- 🔴 is_company_owner 는 false, branch_id 는 null 이다.
    --    권한은 오직 아래 ga_branch_admins 행에서만 나온다.
    insert into public.ga_admin_users (auth_user_id, ga_company_id, branch_id, email, display_name, is_active, is_company_owner)
    values (v_auth_user_id, v_company_id, null, v_email, '지점 매니저', true, false)
    returning id into v_admin_id;
  end if;

  insert into public.ga_branch_admins (ga_admin_user_id, branch_id, granted_by_admin_id)
  values (v_admin_id, p_branch_id, public.current_admin_id())
  on conflict (ga_admin_user_id, branch_id) do nothing;

  perform public._write_ga_audit_log(
    'ga_branch', p_branch_id, 'grant_branch_manager',
    null, jsonb_build_object('email', v_email, 'ga_admin_user_id', v_admin_id)
  );

  return v_admin_id;
end;
$function$;

create or replace function public.revoke_branch_manager(p_branch_id uuid, p_ga_admin_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  delete from public.ga_branch_admins
  where branch_id = p_branch_id and ga_admin_user_id = p_ga_admin_user_id;

  perform public._write_ga_audit_log(
    'ga_branch', p_branch_id, 'revoke_branch_manager',
    null, jsonb_build_object('ga_admin_user_id', p_ga_admin_user_id)
  );
end;
$function$;

create or replace function public.list_branch_managers(p_branch_id uuid)
returns table (ga_admin_user_id uuid, email text, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.id, a.email, a.display_name, m.created_at
  from public.ga_branch_admins m
  join public.ga_admin_users a on a.id = m.ga_admin_user_id
  where m.branch_id = p_branch_id
    and (public.current_admin_id() is not null or public.is_ga_admin_for_branch(p_branch_id))
  order by m.created_at;
$function$;

revoke execute on function public.grant_branch_manager(uuid, text)  from public, anon;
revoke execute on function public.revoke_branch_manager(uuid, uuid) from public, anon;
revoke execute on function public.list_branch_managers(uuid)        from public, anon;
grant  execute on function public.grant_branch_manager(uuid, text)  to authenticated;
grant  execute on function public.revoke_branch_manager(uuid, uuid) to authenticated;
grant  execute on function public.list_branch_managers(uuid)        to authenticated;
