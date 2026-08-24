-- 0116 · 지점 관리자가 **직접** 매니저를 추가/해제한다 (운영진 승인 없이 즉시)
--
-- 오너 지시(2026-08-24): 「기존 지점관리자가 직접 이메일 추가등록 신청할 수 있게 하고,
--   해당 신청은 굳이 운영진이 승인하지 않아도 바로 등록해서 관리할 수 있게」
--   그리고 「컴패니언만 지금 당장 해결하면 뭔 의미냐」
--
-- 🔴 0115 는 운영자 화면만 만들었다. 그러면 사람이 바뀔 때마다 **운영팀을 거쳐야 한다.**
--    지점이 늘수록 병목이 되고, 결국 이번처럼 「막혔다」는 연락을 다시 받는다.
--    그래서 권한을 가진 사람이 스스로 위임할 수 있게 한다.
--
-- 승인 절차를 두지 않는 이유: 자기 지점에 자기가 쓸 사람을 넣는 일이다.
--   운영팀이 판단할 근거가 없고, 기다리게 할 이유도 없다.
--   대신 **누가 누구를 넣었는지 감사 로그에 남긴다.**

-- ── 등록 ─────────────────────────────────────────────────────
-- 🔴 이름·인자가 0115 와 같다. create or replace 가 그대로 대체한다.
--    인자를 바꾸면 함수가 하나 더 생겨 PostgREST 가 후보를 못 고른다(0108).
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
  v_by_admin     uuid := public.current_admin_id();
begin
  -- 운영팀이거나, 그 지점을 관리할 수 있는 사람이면 된다.
  -- 후자가 이번에 추가된 경로다 — 지점장·회사대표·기존 매니저가 여기 해당한다.
  if v_by_admin is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;
  if v_email = '' then
    raise exception 'INVALID_INPUT';
  end if;

  select ga_company_id into v_company_id from public.ga_branch where id = p_branch_id;
  if v_company_id is null then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  select id into v_admin_id from public.ga_admin_users where lower(email) = v_email;

  if v_admin_id is null then
    -- 🔴 보험맵 회원이 아니면 만들어 주지 않는다.
    --    없는 사람 앞으로 계정을 파 두면 **주인 없는 관리 권한**이 생긴다.
    select id into v_auth_user_id from auth.users where lower(email) = v_email;
    if v_auth_user_id is null then
      raise exception 'NO_SUCH_ACCOUNT';
    end if;

    insert into public.ga_admin_users (auth_user_id, ga_company_id, branch_id, email, display_name, is_active, is_company_owner)
    values (v_auth_user_id, v_company_id, null, v_email, '지점 매니저', true, false)
    returning id into v_admin_id;
  end if;

  insert into public.ga_branch_admins (ga_admin_user_id, branch_id, granted_by_admin_id)
  values (v_admin_id, p_branch_id, v_by_admin)
  on conflict (ga_admin_user_id, branch_id) do nothing;

  perform public._write_ga_audit_log(
    'ga_branch', p_branch_id, 'grant_branch_manager',
    null,
    jsonb_build_object(
      'email', v_email,
      'ga_admin_user_id', v_admin_id,
      -- 운영팀이 넣었는지, 지점 쪽에서 스스로 넣었는지 구분해 둔다
      'by', case when v_by_admin is null then 'partner' else 'platform_admin' end,
      'by_auth_user_id', auth.uid()
    )
  );

  return v_admin_id;
end;
$function$;

-- ── 해제 ─────────────────────────────────────────────────────
create or replace function public.revoke_branch_manager(p_branch_id uuid, p_ga_admin_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_by_admin uuid := public.current_admin_id();
begin
  if v_by_admin is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.ga_branch_admins
  where branch_id = p_branch_id and ga_admin_user_id = p_ga_admin_user_id;

  perform public._write_ga_audit_log(
    'ga_branch', p_branch_id, 'revoke_branch_manager',
    null,
    jsonb_build_object(
      'ga_admin_user_id', p_ga_admin_user_id,
      'by', case when v_by_admin is null then 'partner' else 'platform_admin' end,
      'by_auth_user_id', auth.uid()
    )
  );
end;
$function$;

-- 🔴 이 두 함수는 RLS 정책이 호출하지 않는다(직접 확인).
--    RLS 가 부르는 함수의 권한을 좁히면 공개 페이지가 죽는다 — 2026-08-24에 실제로 그랬다.
--    확인: select * from pg_policies where qual like '%함수이름%';
revoke execute on function public.grant_branch_manager(uuid, text)  from public, anon;
revoke execute on function public.revoke_branch_manager(uuid, uuid) from public, anon;
grant  execute on function public.grant_branch_manager(uuid, text)  to authenticated;
grant  execute on function public.revoke_branch_manager(uuid, uuid) to authenticated;
