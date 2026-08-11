-- =========================================================
-- 0101_resubmit_branch_registration.sql
-- 반려된 지점 등록을 다시 심사받는 경로(오너 지시 "수정 후 재심사요청", CTO 방향 B).
--
-- 🔴 이건 신규 기능이 아니라 화면이 이미 한 약속을 뒤늦게 이행하는 것이다.
-- /partner/branches/[branchId]가 반려 상태에서 "정보를 수정해 다시 제출해주세요"라고
-- 안내하는데, 다시 제출할 경로가 없었다. 지금까지 안 터진 이유는 실사용 반려 건이
-- 없었기 때문이고(반려 2건은 우리가 한 시드 정리), 실사용자가 한 명이라도 반려되는
-- 순간 바로 드러난다.
--
-- 막혀 있던 구조(운영 함수 원문으로 확인):
--   submit_branch_registration / _incomplete 둘 다
--     시작   if v_admin.ga_company_id is not null → ALREADY_HAS_COMPANY
--     종료   update ga_admin_users set ga_company_id = ...  ← 스스로 게이트를 잠근다
--   review_branch_registration
--     status <> 'pending' → ALREADY_REVIEWED
--   'update' 분기로 우회해도 registration_status를 건드리지 않아 'rejected'로 굳는다
--   → 재심사·신규제출·우회 3경로 전부 닫혀 있었다.
--
-- 방향 A(ga_admin_users.ga_company_id를 null로 밀어 처음부터 새로 등록)는 기각했다.
-- 반려 사유를 고치라고 해놓고 고칠 대상을 지우는 셈이라, 사진·소개글이 전부 사라진다.
-- =========================================================

create or replace function public.resubmit_branch_registration(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reg public.branch_registrations;
begin
  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;

  -- 🔴 p_registration_id를 그대로 믿지 않는다. 남의 반려 건을 되살릴 수 있으면 안 된다.
  -- add_branch_media가 쓰는 것과 같은 소유권 헬퍼를 재사용한다(판정 기준을 한 곳에 둔다).
  if not public.is_ga_admin_for_branch(v_reg.branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  -- 반려 건만 되돌린다. 나머지 상태는 각자의 경로가 따로 있어 여기로 오면 안 된다.
  if v_reg.status = 'pending' then
    raise exception 'ALREADY_PENDING';
  end if;
  if v_reg.status = 'approved' then
    raise exception 'ALREADY_APPROVED';
  end if;
  if v_reg.status <> 'rejected' then
    raise exception 'NOT_REJECTED';
  end if;

  -- 반려 흔적을 지우고 심사 대기로 되돌린다. review_reason도 여기서 사라지므로,
  -- 화면은 이 RPC를 호출하기 "전에" 반려 사유를 사용자에게 보여줘야 한다(화면 요구사항).
  update public.branch_registrations set
    status = 'pending',
    reviewed_by_admin_id = null,
    reviewed_at = null,
    review_reason = null,
    updated_at = now()
  where id = p_registration_id;

  -- 🔴 registration_status만 되돌린다. status(공개 여부)는 건드리지 않는다 - 'hidden'
  -- 그대로 두어야 한다. 공개 여부는 승인 시점에 review_branch_registration이 회사
  -- 승인상태를 보고 정하는 값이라, 여기서 손대면 심사가 끝나지 않은 지점이 공개된다.
  update public.ga_branch set
    registration_status = 'pending',
    status_reason = 'content_review'
  where id = v_reg.branch_id;

  -- 🔴 ga_admin_users는 건드리지 않는다. ga_company_id/branch_id 연결을 유지해야
  -- 사용자가 "기존 지점을 고쳐서" 다시 낼 수 있다 - 그게 방향 B의 핵심이다.
  -- (방향 A였다면 여기를 null로 밀었을 자리다.)
  --
  -- 사진·소개글 재검증도 하지 않는다. 그 검증은 review_branch_registration이 승인
  -- 시점의 최신값으로 수행하므로(0100), 여기서 또 검사하면 두 곳의 기준이 어긋난다.
end;
$$;

grant execute on function public.resubmit_branch_registration(uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'resubmit_branch_registration';
-- 잠긴 시험 대상(시드 정리로 반려된 2건):
-- select id, status, review_reason from public.branch_registrations where status = 'rejected';
