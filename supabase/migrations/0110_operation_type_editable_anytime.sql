-- =========================================================
-- 0110_operation_type_editable_anytime.sql
-- 직영/지사는 **언제든 지점 담당자가 직접 바꾼다.** 관리자 승인을 거치지 않는다.
-- (오너 지시 2026-08-13)
--
-- ---------------------------------------------------------
-- 무엇을 바꾸나
-- ---------------------------------------------------------
-- 기존 `set_branch_operation_type`은 GA 담당자에게 **심사 전(pending)에만** 허용했다:
--
--     if v_registration_status <> 'pending' then
--       raise exception 'REQUIRES_REVIEW';
--     end if;
--
-- 그래서 승인이 끝난 지점은 담당자가 못 고치고 수정 요청 큐를 타야 했다.
-- **오너 지시는 그 반대다** — 잘못 고른 지점이 있을 수 있으니 지점 수정에서 언제든
-- 바꿀 수 있어야 하고, 그 변경은 승인 없이 즉시 반영된다. 그 게이트를 제거한다.
--
-- ---------------------------------------------------------
-- 왜 이건 즉시 반영이어도 되나
-- ---------------------------------------------------------
-- 심사를 거는 이유는 **자유 입력 텍스트가 공개 화면에 그대로 나가기 때문**이다
-- (짧은 소개·한 줄 소개가 그렇다 - 0108 참고). 직영/지사는 자유 입력이 아니라
-- **두 값 중 하나**이고, 어느 쪽을 골라도 부적절한 문구가 노출될 수 없다.
-- 즉 심사가 막아 줄 것이 없다.
--
-- 🔴 소유권 검사는 그대로 둔다. `is_ga_admin_for_branch`를 통과해야 하므로
-- **자기 지점만** 바꿀 수 있다. 없앤 것은 「승인 이후 잠금」이지 「권한 확인」이 아니다.
--
-- ⚠️ 값 검증도 그대로다. 'direct'/'branch' 외에는 INVALID_OPERATION_TYPE으로 막는다 -
-- CHECK 제약 위반(23514)으로 올라오면 어느 필드인지 구분이 안 된다.
-- =========================================================

create or replace function public.set_branch_operation_type(
  p_branch_id uuid,
  p_operation_type text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_operation_type is null or p_operation_type not in ('direct', 'branch') then
    raise exception 'INVALID_OPERATION_TYPE';
  end if;

  -- 플랫폼 관리자이거나, 그 지점의 담당자여야 한다.
  -- 🔴 여기서 심사 상태를 보지 않는다(0110에서 제거) - 승인 이후에도 바꿀 수 있다.
  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
  end if;

  update public.ga_branch
  set operation_type = p_operation_type,
      updated_at = now()
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
end;
$$;

-- 🔴 `from public`만으로는 anon이 안 지워진다(Supabase가 함수 생성 시점에 anon에게
-- 직접 grant를 준다). 0109에서 같은 자리를 고쳤으므로 처음부터 롤을 직접 적는다.
revoke all on function public.set_branch_operation_type(uuid, text) from public, anon;
grant execute on function public.set_branch_operation_type(uuid, text) to authenticated;

comment on function public.set_branch_operation_type(uuid, text) is
  '지점 직영/지사 구분 저장. 자기 지점이면 심사 상태와 무관하게 언제든 즉시 반영된다'
  '(오너 확정 2026-08-13). 두 값 중 하나라 자유 입력처럼 심사가 막아 줄 것이 없다.';

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select (select string_agg(l, E'\n') from unnest(string_to_array(pg_get_functiondef(p.oid), E'\n')) l
--          where btrim(l) not like '--%') ilike '%REQUIRES_REVIEW%' as still_gated,
--        array_to_string(p.proacl, ' | ') as acl
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'set_branch_operation_type';
-- 기대값: still_gated = false · acl에 anon 없음
