-- =========================================================
-- 0046_push_tokens.sql
-- 앱(모바일) 푸시 알림을 위한 토큰 저장소. WEB_MASTER_ROADMAP.md 8절 #1,
-- 앱 저장소 MOBILE_APP_MASTER_PLAN.md 5.3절이 요청한 "웹팀이 구현해야 할" 항목.
--
-- 흐름: 앱이 Expo Push Token을 얻음 → 브릿지(postMessage)로 웹에 전달
--       → 웹이 이 RPC로 저장 → (후속 작업) 이벤트 발생 시 서버가 이 테이블을
--       조회해 Expo Push API로 발송.
--
-- auth_user_id 기준으로 저장한다(public.users/ga_admin_users/admin_users 중
-- 어느 identity에도 종속되지 않음 - 세 시스템 모두가 공유하는 유일한 공통 축이
-- auth.uid()이기 때문). 실제 "누구에게 보낼지"는 발송 로직이 이벤트 종류에 맞는
-- identity 테이블과 조인해서 판단한다(이 마이그레이션의 책임 밖).
--
-- 0045 적용 후 실행.
-- =========================================================

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index idx_push_tokens_auth_user on public.push_tokens(auth_user_id);

alter table public.push_tokens enable row level security;

-- 본인 토큰만 조회 가능(자기 알림 설정 화면 등에 쓸 수 있도록). 쓰기는 RPC 전용.
create policy "user reads own push tokens"
  on public.push_tokens for select
  using (auth_user_id = auth.uid());

-- ---------------------------------------------------------
-- 등록 - 같은 토큰(같은 디바이스)이 다른 계정으로 재로그인하면 소유자를 최신
-- 계정으로 갱신한다(로그아웃 후 다른 계정 로그인 시나리오 대응).
-- ---------------------------------------------------------
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'INVALID_PLATFORM';
  end if;
  if length(trim(coalesce(p_token, ''))) = 0 then
    raise exception 'INVALID_TOKEN';
  end if;

  insert into public.push_tokens (auth_user_id, token, platform)
  values (auth.uid(), trim(p_token), p_platform)
  on conflict (token) do update set
    auth_user_id = excluded.auth_user_id,
    platform = excluded.platform,
    updated_at = now(),
    last_seen_at = now();
end;
$$;

grant execute on function public.register_push_token(text, text) to authenticated;

-- ---------------------------------------------------------
-- 해제 - 로그아웃 시 또는 앱이 푸시 권한을 껐을 때 호출.
-- ---------------------------------------------------------
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where token = trim(p_token);
end;
$$;

grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select platform, count(*) from public.push_tokens group by 1;
-- select proname from pg_proc where proname in ('register_push_token','unregister_push_token');
