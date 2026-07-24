-- =========================================================
-- 0012_users_schema.sql
-- 일반회원(카카오/구글 OAuth) 스키마 - 실제 로그인 활성화.
-- src/types/database.ts의 users/favorites Row 타입과 정확히 일치해야 한다.
-- 0001~0011 적용 후 실행. 재실행해도 안전(if not exists).
-- =========================================================

-- ---------------------------------------------------------
-- A. users - OAuth로 로그인한 일반회원
--    approval_status: 지금은 가입 즉시 'approved'로 자동 승인한다(별도 승인 관리 화면 없음).
--    추후 관리자 승인制로 전환하려면 기본값을 'pending'으로 바꾸고 관리자 전용 승인 함수를 추가하면 된다.
-- ---------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  nickname text not null default '보험맵 회원',
  profile_image text,
  provider text not null check (provider in ('kakao', 'google', 'email')),
  approval_status text not null default 'approved' check (approval_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);

alter table public.users enable row level security;

drop policy if exists "users can read own row" on public.users;
create policy "users can read own row"
  on public.users for select
  using (auth_user_id = auth.uid());

drop policy if exists "users can insert own row" on public.users;
create policy "users can insert own row"
  on public.users for insert
  with check (auth_user_id = auth.uid());

drop policy if exists "users can update own row" on public.users;
create policy "users can update own row"
  on public.users for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ---------------------------------------------------------
-- B. favorites - 즐겨찾기 (스키마만 준비, 액션 연동은 이번 범위 밖 - mock 유지)
-- ---------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, branch_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_branch_id on public.favorites(branch_id);

alter table public.favorites enable row level security;

drop policy if exists "users manage own favorites" on public.favorites;
create policy "users manage own favorites"
  on public.favorites for all
  using (user_id in (select id from public.users where auth_user_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_user_id = auth.uid()));

-- ---------------------------------------------------------
-- C. updated_at 자동 갱신 트리거 (0001의 set_updated_at() 재사용)
-- ---------------------------------------------------------
drop trigger if exists trg_set_updated_at on public.users;
create trigger trg_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 사용자가 직접 검증)
-- ---------------------------------------------------------
-- select table_name from information_schema.tables where table_schema = 'public' and table_name in ('users','favorites');
-- select policyname, cmd from pg_policies where tablename in ('users','favorites');
