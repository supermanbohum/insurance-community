-- =========================================================
-- 0079_home_open_banner.sql
-- 홈 "오픈 카운트다운" 배너 문구를 코드가 아니라 DB로 옮긴다. PROMO_PLAN(홍보조,
-- 2026-08-08) §3: 8/17 09:00에 "정식 오픈을 받고 있습니다" → "정식 오픈했습니다"로
-- 문구를 바꿔야 하는데, 오픈 당일 아침에 git 배포를 거는 건 리스크다(빌드 실패·캐시
-- 등 변수를 오픈 순간에 넣게 된다) - event_popups(0032)와 동일 패턴으로 관리자가
-- 재배포 없이 몇 번의 클릭으로 바꿀 수 있게 한다.
--
-- event_popups와 달리 시작/종료 시각 자동 전환은 두지 않는다(PROMO_PLAN이 09:00에
-- 사람이 직접 누르는 걸로 명시) - is_active로 켜고 끄고, 문구는 그때그때 덮어쓴다.
-- RLS 정책 없음(service role 전용, event_popups와 동일 관례).
-- =========================================================

create table if not exists public.home_open_banner (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default false,
  headline text not null default '',
  subtext text not null default '',
  cta_label text not null default '우리 지점 등록하기 →',
  cta_href text not null default '/register',
  updated_by_admin_id uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_open_banner enable row level security;
-- 정책 없음 - service role 전용(event_popups와 동일 관례).

drop trigger if exists trg_set_updated_at on public.home_open_banner;
create trigger trg_set_updated_at before update on public.home_open_banner
for each row execute function public.set_updated_at();

-- PROMO_PLAN §3 확정 문구(오픈 전 상태)로 최초 1회 시드한다(테이블이 비어있을 때만).
-- 8/17 09:00에 관리자 화면에서 headline/subtext만 바꾸면 된다(콘텐츠팀 확정 문안 8/16 오전 도착 예정).
insert into public.home_open_banner (is_active, headline, subtext, cta_label, cta_href)
select true, '전국 4,288개 GA의 지점 등록을 받고 있습니다', '8월 17일 정식 오픈', '우리 지점 등록하기 →', '/register'
where not exists (select 1 from public.home_open_banner);

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select id, is_active, headline, subtext from public.home_open_banner order by created_at desc;
