-- =========================================================
-- 0030_chat.sql
-- 플랫폼 전체가 공유하는 공용 실시간 채팅방 1개. 일반 회원가입 + 이메일 인증을
-- 완료한 회원(is_full_member())만 읽고 쓸 수 있다 - 비회원/구글 로그인 회원은
-- 채팅 내용을 조회조차 할 수 없어야 한다.
--
-- 주의 - src/middleware.ts가 모든 방문자에게 익명 Supabase 세션을 자동 발급하므로
-- (비로그인 방문자도 auth.uid()가 non-null, role='authenticated'), 아래 SELECT
-- 정책은 반드시 is_full_member()로 public.users까지 조인해서 확인한다.
-- auth.uid() is not null / auth.role()='authenticated'만으로는 완전히 우회당한다.
--
-- 메시지에는 소속GA/닉네임을 스냅샷으로 저장하지 않는다 - "(소속GA) 이름 설계사"
-- 표시는 항상 조회 시점에 users/ga_company를 조인해서 계산한다(list_chat_messages,
-- get_chat_message). 그래야 GA 변경이 승인되면 과거 메시지 라벨도 자동으로 바뀐다.
--
-- 0029 적용 후 실행.
-- =========================================================

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);

alter table public.chat_messages enable row level security;

-- SELECT 정책만 둔다. INSERT 정책은 의도적으로 만들지 않는다 - 쓰기는
-- send_chat_message() RPC 전용(기존 branch_registrations 등과 동일한 관례이자,
-- 익명 세션 위험을 한 곳(is_full_member) 에서만 확인하면 되게 만드는 안전장치).
create policy "full members read chat"
  on public.chat_messages for select
  using (public.is_full_member());

-- ---------------------------------------------------------
-- 메시지 전송
-- ---------------------------------------------------------
create or replace function public.send_chat_message(p_body text)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_row public.chat_messages;
begin
  if not public.is_full_member() then
    raise exception 'NOT_FULL_MEMBER';
  end if;
  v_member_id := public.current_member_id();

  if length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'EMPTY_MESSAGE';
  end if;
  if length(trim(p_body)) > 500 then
    raise exception 'MESSAGE_TOO_LONG';
  end if;

  insert into public.chat_messages (user_id, body)
  values (v_member_id, trim(p_body))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.send_chat_message(text) to authenticated;

-- ---------------------------------------------------------
-- 과거 메시지 목록 - users/ga_company를 조인해 현재 소속 기준으로 라벨링한다.
-- 키셋 페이지네이션(p_before)으로 스크롤 백을 지원한다.
-- ---------------------------------------------------------
create or replace function public.list_chat_messages(p_before timestamptz default null, p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  nickname text,
  ga_company_name text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.user_id, u.nickname, g.name as ga_company_name, m.body, m.created_at
  from public.chat_messages m
  join public.users u on u.id = m.user_id
  left join public.ga_company g on g.id = u.ga_company_id
  where public.is_full_member()
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.list_chat_messages(timestamptz, int) to authenticated;

-- ---------------------------------------------------------
-- 단건 조회 - Realtime INSERT 이벤트로 방금 도착한 메시지 id만 받았을 때, 조인된
-- 형태로 다시 읽어오기 위해 사용한다.
-- ---------------------------------------------------------
create or replace function public.get_chat_message(p_message_id uuid)
returns table (
  id uuid,
  user_id uuid,
  nickname text,
  ga_company_name text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.user_id, u.nickname, g.name as ga_company_name, m.body, m.created_at
  from public.chat_messages m
  join public.users u on u.id = m.user_id
  left join public.ga_company g on g.id = u.ga_company_id
  where public.is_full_member() and m.id = p_message_id;
$$;

grant execute on function public.get_chat_message(uuid) to authenticated;

-- ---------------------------------------------------------
-- 발신자 라벨 일괄 새로고침 - 채팅창이 열려있는 동안 주기적으로 호출해서, GA 변경
-- 승인이 나면 이미 렌더링된 과거 메시지의 라벨도 몇십 초 안에 자연스럽게 갱신되게 한다.
-- ---------------------------------------------------------
create or replace function public.get_chat_sender_labels(p_user_ids uuid[])
returns table (user_id uuid, nickname text, ga_company_name text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id as user_id, u.nickname, g.name as ga_company_name
  from public.users u
  left join public.ga_company g on g.id = u.ga_company_id
  where public.is_full_member() and u.id = any(p_user_ids);
$$;

grant execute on function public.get_chat_sender_labels(uuid[]) to authenticated;

-- ---------------------------------------------------------
-- Realtime 활성화 - INSERT 이벤트를 브라우저가 구독할 수 있도록 발행 목록에 추가.
-- ---------------------------------------------------------
alter publication supabase_realtime add table public.chat_messages;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname in ('send_chat_message','list_chat_messages','get_chat_message','get_chat_sender_labels');
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages';
