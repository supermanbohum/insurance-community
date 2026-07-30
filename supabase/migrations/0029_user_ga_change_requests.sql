-- =========================================================
-- 0029_user_ga_change_requests.sql
-- 일반회원의 "소속 GA 변경 신청" - branch_registrations(0022)와 동일한 모양의
-- 관리자 승인 큐. 이직 등으로 소속이 바뀌는 경우를 위한 기능이며, 즉시 반영되지
-- 않고 관리자 승인 후에만 public.users.ga_company_id가 갱신된다.
--
-- 0028 적용 후 실행.
-- =========================================================

create table if not exists public.user_ga_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_ga_company_id uuid references public.ga_company(id),
  requested_ga_company_id uuid not null references public.ga_company(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_ga_change_requests_user on public.user_ga_change_requests(user_id);
create index if not exists idx_user_ga_change_requests_status on public.user_ga_change_requests(status);

do $$
begin
  drop trigger if exists trg_set_updated_at on public.user_ga_change_requests;
  create trigger trg_set_updated_at before update on public.user_ga_change_requests
    for each row execute function public.set_updated_at();
end $$;

-- RLS - 본인 신청 내역만 조회 가능. INSERT/UPDATE 정책은 두지 않는다(기존 관례와 동일하게
-- 전부 RPC 전용 - 관리자 조회는 서비스롤 클라이언트로 별도 처리).
alter table public.user_ga_change_requests enable row level security;

create policy "members read own ga change requests"
  on public.user_ga_change_requests for select
  using (user_id = public.current_member_id());

-- ---------------------------------------------------------
-- 신청 - 대기중인 신청이 이미 있거나, 요청 GA가 현재 소속과 같으면 거부한다.
-- ---------------------------------------------------------
create or replace function public.request_ga_change(p_ga_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := public.current_member_id();
  v_current_ga_id uuid;
  v_request_id uuid;
begin
  if v_member_id is null then
    raise exception 'NOT_A_MEMBER';
  end if;
  if not public.is_full_member() then
    raise exception 'NOT_FULL_MEMBER';
  end if;
  if not exists (select 1 from public.ga_company where id = p_ga_company_id) then
    raise exception 'INVALID_GA_COMPANY';
  end if;
  if exists (select 1 from public.user_ga_change_requests where user_id = v_member_id and status = 'pending') then
    raise exception 'PENDING_REQUEST_EXISTS';
  end if;

  select ga_company_id into v_current_ga_id from public.users where id = v_member_id;
  if v_current_ga_id = p_ga_company_id then
    raise exception 'SAME_GA';
  end if;

  insert into public.user_ga_change_requests (user_id, current_ga_company_id, requested_ga_company_id)
  values (v_member_id, v_current_ga_id, p_ga_company_id)
  returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.request_ga_change(uuid) to authenticated;

-- ---------------------------------------------------------
-- 관리자 승인/반려 - 승인 시 public.users.ga_company_id를 갱신한다.
-- ---------------------------------------------------------
create or replace function public.review_ga_change_request(
  p_request_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_req public.user_ga_change_requests;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_req from public.user_ga_change_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  if p_decision = 'approved' then
    update public.users set ga_company_id = v_req.requested_ga_company_id where id = v_req.user_id;
  end if;

  update public.user_ga_change_requests
  set status = p_decision, reviewed_by_admin_id = v_admin_id, reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_request_id;
end;
$$;

grant execute on function public.review_ga_change_request(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 본인 신청 이력 조회 (마이페이지)
-- ---------------------------------------------------------
create or replace function public.list_my_ga_change_requests()
returns setof public.user_ga_change_requests
language sql
stable
security definer
set search_path = public
as $$
  select * from public.user_ga_change_requests
  where user_id = public.current_member_id()
  order by created_at desc;
$$;

grant execute on function public.list_my_ga_change_requests() to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname in ('request_ga_change','review_ga_change_request','list_my_ga_change_requests');
