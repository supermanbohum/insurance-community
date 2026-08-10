-- =========================================================
-- 0090_branch_planner_gate_events.sql
-- ③ ⓑ 등록 폼의 "지점 미연결 하드 게이트" 측정(CTO 지시, 2026-08-10) - 이 게이트가
-- 손실인지 지점 획득 채널인지는 숫자로만 판단할 수 있다:
--   1) 소속 지점을 못 찾아 막힌 횟수
--   2) 지점장에게 전달(카카오톡/링크복사) 버튼 클릭 횟수
-- branch_contact_clicks(0015)와 동일한 "insert-only 로그 + security definer RPC"
-- 패턴이다. 완벽한 분석 인프라가 아니라 두 숫자만 세면 되므로 최소로 만든다 -
-- 로그인 여부와 무관하게 기록한다(비로그인 방문자도 막힐 수 있다).
-- =========================================================
create table public.branch_planner_gate_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('blocked', 'forward_click')),
  created_at timestamptz not null default now()
);

create index branch_planner_gate_events_type_idx on public.branch_planner_gate_events (event_type, created_at);

alter table public.branch_planner_gate_events enable row level security;

-- 개인정보를 전혀 담지 않는 카운트 전용 로그라 관리자만 조회 가능하면 충분하다
-- (공개 select 정책 없음 - RLS 기본값인 전면 차단이 그대로 적용된다).
create policy "admin reads branch planner gate events" on public.branch_planner_gate_events
  for select using (current_admin_id() is not null);

create or replace function public.record_branch_planner_gate_event(p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('blocked', 'forward_click') then
    raise exception 'INVALID_EVENT_TYPE';
  end if;
  insert into public.branch_planner_gate_events (event_type) values (p_event_type);
end;
$$;

grant execute on function public.record_branch_planner_gate_event(text) to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select event_type, count(*) from public.branch_planner_gate_events group by event_type;
