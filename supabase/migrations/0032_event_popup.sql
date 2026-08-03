-- =========================================================
-- 0032_event_popup.sql
-- 출시 이벤트 팝업 내용을 코드가 아니라 DB로 옮긴다 - 관리자가 재배포 없이
-- 문구/기간/on-off를 바꿀 수 있어야 하기 때문이다. banners 테이블
-- (is_active + start_at/end_at로 기간 노출)과 같은 패턴을 그대로 따른다.
--
-- 일반 사용자에게는 RLS 정책을 두지 않는다 - Root Layout(서버 컴포넌트)이
-- service role(admin client)로 조회한 결과만 클라이언트에 내려주므로,
-- 브라우저가 이 테이블에 직접 접근할 경로 자체가 없다
-- (site_settings/audit_logs와 동일한 관례, 0002_rls_policies.sql 참고).
-- =========================================================

create table if not exists public.event_popups (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  eyebrow text not null default '',
  headline text not null default '',
  offer_label text not null default '',
  old_price text not null default '',
  badge text not null default '',
  highlight text not null default '',
  highlight_suffix text not null default '',
  description text not null default '',
  features text[] not null default '{}',
  footnote text not null default '',
  cta_label text not null default '지금 시작하기',
  cta_href text not null default '/partner/register',
  updated_by_admin_id uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_popups enable row level security;
-- 정책 없음(위 설명 참고) - service role 전용.

drop trigger if exists trg_set_updated_at on public.event_popups;
create trigger trg_set_updated_at before update on public.event_popups
for each row execute function public.set_updated_at();

-- 기존에 코드에 하드코딩돼 있던 출시 이벤트 내용을 최초 1회 시드한다(테이블이 비어있을 때만).
insert into public.event_popups (
  is_active, start_at, end_at, eyebrow, headline, offer_label, old_price, badge,
  highlight, highlight_suffix, description, features, footnote, cta_label, cta_href
)
select
  true, now(), null,
  '🎉 보험맵 GRAND OPEN', '보험맵 전격 출시!', '🎁 오픈 기념 이벤트', '월 4,900원', '선착순 100개 지점',
  '6개월 무료', '(0원)', E'보험설계사를 위한\n전국 GA · 지점 검색 플랫폼',
  array['지점 등록', 'TOP설계사 등록', '실시간 채팅', '커뮤니티'],
  '※ 현재 등록비 및 월 이용료는 오픈 이벤트 기간 동안 전액 무료입니다.',
  '지금 시작하기', '/partner/register'
where not exists (select 1 from public.event_popups);

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select id, is_active, start_at, end_at, headline from public.event_popups order by created_at desc;
