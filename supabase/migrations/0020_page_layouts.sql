-- =========================================================
-- 0020_page_layouts.sql
-- 디자인 편집모드 - 관리자가 홈 화면/지점상세 페이지의 섹션 순서·노출 여부·
-- 여백·일부 문구를 기기별(모바일/태블릿/PC)로 저장해두면, 공개 페이지가
-- 그 설정을 읽어 렌더링한다. 저장된 설정이 없으면(마이그레이션 미실행 포함)
-- 코드 쪽 기본값으로 폴백하므로 이 마이그레이션을 아직 실행하지 않아도
-- 기존 화면은 지금과 동일하게 보인다.
--
-- 0008 적용 후 실행.
-- =========================================================

create table if not exists public.page_layouts (
  id uuid primary key default gen_random_uuid(),
  page_key text not null check (page_key in ('home', 'branch_detail')),
  device text not null check (device in ('mobile', 'tablet', 'desktop')),
  config jsonb not null default '[]'::jsonb,
  updated_by_admin_id uuid references public.admin_users(id),
  updated_at timestamptz not null default now(),
  unique (page_key, device)
);

alter table public.page_layouts enable row level security;

-- 공개 페이지 렌더링에 필요 - 로그인 여부와 무관하게 전부 읽을 수 있어야 한다.
create policy "public read page_layouts"
  on public.page_layouts for select
  using (true);

-- INSERT/UPDATE/DELETE 정책은 두지 않는다 - 모든 쓰기는 아래 SECURITY DEFINER
-- 함수를 통해서만 이루어진다 (0008의 다른 관리자 전용 함수들과 동일한 원칙).
create or replace function public.upsert_page_layout(
  p_page_key text,
  p_device text,
  p_config jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  if p_page_key not in ('home', 'branch_detail') then
    raise exception 'INVALID_PAGE_KEY';
  end if;

  if p_device not in ('mobile', 'tablet', 'desktop') then
    raise exception 'INVALID_DEVICE';
  end if;

  insert into public.page_layouts (page_key, device, config, updated_by_admin_id, updated_at)
  values (p_page_key, p_device, p_config, public.current_admin_id(), now())
  on conflict (page_key, device) do update
    set config = excluded.config,
        updated_by_admin_id = excluded.updated_by_admin_id,
        updated_at = now();
end;
$$;

grant execute on function public.upsert_page_layout(text, text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 직접 검증)
-- ---------------------------------------------------------
-- select proname from pg_proc where proname = 'upsert_page_layout';
-- select page_key, device, config from public.page_layouts;
