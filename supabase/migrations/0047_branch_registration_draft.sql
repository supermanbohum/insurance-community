-- =========================================================
-- 0047_branch_registration_draft.sql
-- 지점 "신규 등록"(최초 제출) 폼의 임시저장(item 10 잔여분). 0043은 이미 등록된
-- 지점의 "수정" 요청(branch_registrations)에만 draft를 지원했다 - 신규 등록은
-- submit_branch_registration이 호출되는 순간 ga_company/ga_branch 실제 행을
-- 즉시 만들어버리는 구조라(0022) 같은 방식을 그대로 쓸 수 없다.
--
-- 대신 신규 등록 전용의 훨씬 가벼운 접근: ga_company/ga_branch를 전혀 건드리지
-- 않고, "아직 제출 전" 입력값 전체를 GA 관리자 1인당 1행짜리 jsonb 스크래치
-- 공간에만 저장한다. 실제 제출은 여전히 기존 submit_branch_registration
-- RPC(변경 없음)가 그대로 담당하고, 성공하면 이 draft는 지운다.
--
-- 파일(임대차계약서/명함/사진/영상)은 draft 대상이 아니다 - 실제 업로드는 지점이
-- 만들어진 뒤에만 가능한 구조라(registration_id 필요) 텍스트 필드만 복원된다.
--
-- 0043 적용 후 실행.
-- =========================================================

create table public.ga_admin_registration_drafts (
  ga_admin_id uuid primary key references public.ga_admin_users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ga_admin_registration_drafts enable row level security;

create policy "ga admin reads own registration draft"
  on public.ga_admin_registration_drafts for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.id = ga_admin_registration_drafts.ga_admin_id and ga.auth_user_id = auth.uid() and ga.is_active = true
    )
  );

-- ---------------------------------------------------------
-- 임시저장 - 이미 소속 GA가 있는 관리자는 신규 등록 대상이 아니므로 막는다
-- (submit_branch_registration의 ALREADY_HAS_COMPANY 가드와 동일한 전제).
-- ---------------------------------------------------------
create or replace function public.save_branch_registration_draft(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if v_admin.ga_company_id is not null then
    raise exception 'ALREADY_HAS_COMPANY';
  end if;

  insert into public.ga_admin_registration_drafts (ga_admin_id, payload, updated_at)
  values (v_admin.id, coalesce(p_payload, '{}'::jsonb), now())
  on conflict (ga_admin_id) do update set
    payload = coalesce(p_payload, '{}'::jsonb),
    updated_at = now();
end;
$$;

grant execute on function public.save_branch_registration_draft(jsonb) to authenticated;

-- ---------------------------------------------------------
-- 조회 - 등록 폼 진입 시 이전 작성 내용을 복원한다.
-- ---------------------------------------------------------
create or replace function public.get_my_branch_registration_draft()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select d.payload from public.ga_admin_registration_drafts d
  join public.ga_admin_users ga on ga.id = d.ga_admin_id
  where ga.auth_user_id = auth.uid() and ga.is_active = true;
$$;

grant execute on function public.get_my_branch_registration_draft() to authenticated;

-- ---------------------------------------------------------
-- 삭제 - 실제 제출 성공 직후 호출해 남은 초안을 정리한다.
-- ---------------------------------------------------------
create or replace function public.clear_branch_registration_draft()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  delete from public.ga_admin_registration_drafts where ga_admin_id = v_admin.id;
end;
$$;

grant execute on function public.clear_branch_registration_draft() to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select count(*) from public.ga_admin_registration_drafts;
-- select proname from pg_proc where proname in (
--   'save_branch_registration_draft','get_my_branch_registration_draft','clear_branch_registration_draft'
-- );
