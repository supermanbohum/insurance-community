-- =========================================================
-- 0033_chat_daily_archive.sql
-- 실시간 채팅을 매일 00:00(KST) 기준으로 초기화한다 - 목표는 "항상 당일 채팅만
-- 보이는 것"이다. 단순 삭제 대신 chat_messages_archive로 옮기는 방식을 택했다
-- (관리자가 이전 대화를 나중에라도 조회할 수 있도록 보존).
--
-- pg_cron으로 매일 15:00 UTC(=00:00 KST, UTC+9)에 자동 실행한다.
-- =========================================================

create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------
-- 보관 테이블 - chat_messages와 같은 모양이되, 사용자가 나중에 탈퇴해도 기록 자체는
-- 남도록 on delete cascade 대신 set null을 쓴다(사고 기록/통계 목적의 보관이므로).
-- 일반 사용자에게는 RLS 정책을 두지 않는다 - site_settings/audit_logs와 동일한 관례로,
-- 관리자 화면(service role)에서만 조회한다.
-- ---------------------------------------------------------
create table if not exists public.chat_messages_archive (
  id uuid primary key,
  user_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null,
  archived_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_archive_created_at on public.chat_messages_archive(created_at desc);

alter table public.chat_messages_archive enable row level security;
-- 정책 없음(위 설명 참고) - service role 전용.

-- ---------------------------------------------------------
-- 자정(KST) 이전 메시지를 보관 테이블로 옮기고 원본에서 지운다(원자적으로 한 번에).
-- ---------------------------------------------------------
create or replace function public.archive_old_chat_messages()
returns void
language plpgsql
as $$
declare
  v_cutoff timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  with moved as (
    delete from public.chat_messages
    where created_at < v_cutoff
    returning id, user_id, body, created_at
  )
  insert into public.chat_messages_archive (id, user_id, body, created_at)
  select id, user_id, body, created_at from moved;
end;
$$;

-- 매일 15:00 UTC = 00:00 KST에 실행. 이미 같은 이름의 스케줄이 있으면 먼저 지우고 재등록
-- (마이그레이션을 다시 실행해도 중복 등록되지 않게).
select cron.unschedule(jobid) from cron.job where jobname = 'archive-chat-daily';
select cron.schedule('archive-chat-daily', '0 15 * * *', $$select public.archive_old_chat_messages();$$);

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from cron.job where jobname = 'archive-chat-daily';
-- select public.archive_old_chat_messages(); -- 수동으로 한 번 실행해 동작 확인 가능
-- select count(*) from public.chat_messages_archive;
