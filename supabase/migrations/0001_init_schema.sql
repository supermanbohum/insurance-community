-- =========================================================
-- 0001_init_schema.sql
-- 보험설계사 익명 커뮤니티 - 초기 스키마
-- Supabase SQL Editor에서 순서대로 실행 (0001 -> 0002 -> 0003)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. anonymous_profiles
--    Supabase auth.users(익명 사용자)와 1:1 매핑되는 내부 프로필.
--    화면/일반 API에는 원본 UUID를 노출하지 않고, 이 테이블의
--    surrogate id 또는 최소 정보만 사용한다.
-- ---------------------------------------------------------
create table if not exists public.anonymous_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  last_author_name text, -- 참고용 서버 저장(선택). 브라우저 localStorage가 주 저장소.
  is_blocked boolean not null default false,
  blocked_until timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_anonymous_profiles_auth_user_id
  on public.anonymous_profiles(auth_user_id);

-- ---------------------------------------------------------
-- 2. admin_users - 관리자 role 구조
-- ---------------------------------------------------------
create type public.admin_role as enum (
  'super_admin',
  'content_admin',
  'moderation_admin',
  'banner_admin'
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '관리자',
  role public.admin_role not null default 'moderation_admin',
  can_adjust_metrics boolean not null default false,
  can_override_best boolean not null default false,
  can_edit_author_name boolean not null default false,
  can_change_created_at boolean not null default false,
  can_pin_posts boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. categories
-- ---------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  admin_only_write boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. posts
--    수치는 organic(실제) / imported(이전 서비스 이관) / correction(오류 보정)
--    으로 분리 저장한다. 화면 표시값은 세 값의 합(0 미만 방지)으로 계산한다.
--    관리자는 organic_* 을 직접 수정할 수 없다 (RLS + 함수로 강제).
-- ---------------------------------------------------------
create type public.author_name_type as enum ('custom', 'random', 'admin', 'system');
create type public.best_override_status as enum ('auto', 'force_include', 'force_exclude');

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  author_id uuid not null references public.anonymous_profiles(id),
  author_admin_id uuid references public.admin_users(id), -- 관리자 작성 글인 경우

  title text not null,
  content text not null,

  -- 작성자 표시명
  author_display_name text not null,
  author_name_type public.author_name_type not null default 'random',

  -- ---- 조회수: organic / imported / correction 분리 ----
  organic_view_count bigint not null default 0,
  imported_view_count bigint not null default 0,
  correction_view_count bigint not null default 0,

  -- ---- 추천수: organic / imported / correction 분리 ----
  organic_upvote_count bigint not null default 0,
  imported_upvote_count bigint not null default 0,
  correction_upvote_count bigint not null default 0,

  -- ---- 비추천수: organic / imported / correction 분리 ----
  organic_downvote_count bigint not null default 0,
  imported_downvote_count bigint not null default 0,
  correction_downvote_count bigint not null default 0,

  -- ---- 댓글수: organic(실제 공개 댓글) / correction(보정) ----
  organic_comment_count bigint not null default 0,
  correction_comment_count bigint not null default 0,

  -- ---- 베스트 관련 ----
  auto_best_score numeric not null default 0,       -- 시스템이 계산하는 자동 점수
  best_override_status public.best_override_status not null default 'auto',
  best_rank_override int,                            -- 낮을수록 상단, null이면 자동순위

  -- ---- 운영자 추천(Editor Pick) - 추천수 위장이 아닌 별도 배지 ----
  editor_pick boolean not null default false,
  editor_pick_rank int,
  editor_pick_reason text,
  editor_pick_start_at timestamptz,
  editor_pick_end_at timestamptz,

  is_pinned boolean not null default false,
  pinned_rank int,
  is_notice boolean not null default false,

  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  is_seo_indexable boolean not null default true,

  report_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_posts_category_id on public.posts(category_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_status on public.posts(status);
create index if not exists idx_posts_auto_best_score on public.posts(auto_best_score desc);
create index if not exists idx_posts_author_id on public.posts(author_id);
create index if not exists idx_posts_editor_pick on public.posts(editor_pick) where editor_pick = true;
create index if not exists idx_posts_best_override on public.posts(best_override_status);

-- ---------------------------------------------------------
-- 5. post_images
-- ---------------------------------------------------------
create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_images_post_id on public.post_images(post_id);

-- ---------------------------------------------------------
-- 6. comments
-- ---------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade, -- 1단계 대댓글만 허용(앱 레벨에서 강제)
  author_id uuid not null references public.anonymous_profiles(id),
  author_admin_id uuid references public.admin_users(id),

  content text not null,
  author_display_name text not null,
  author_name_type public.author_name_type not null default 'random',

  organic_upvote_count bigint not null default 0,
  imported_upvote_count bigint not null default 0,
  correction_upvote_count bigint not null default 0,

  organic_downvote_count bigint not null default 0,
  imported_downvote_count bigint not null default 0,
  correction_downvote_count bigint not null default 0,

  is_pinned boolean not null default false,
  is_best_comment boolean not null default false,

  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  report_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_comments_parent_comment_id on public.comments(parent_comment_id);
create index if not exists idx_comments_author_id on public.comments(author_id);

-- ---------------------------------------------------------
-- 7. reactions (추천/비추천) - 실제 사용자 반응만 저장.
--    관리자는 이 테이블에 절대 쓰기 권한이 없다 (RLS로 강제).
-- ---------------------------------------------------------
create type public.reaction_target as enum ('post', 'comment');
create type public.reaction_value as enum ('up', 'down');

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  target_type public.reaction_target not null,
  target_id uuid not null,
  anonymous_profile_id uuid not null references public.anonymous_profiles(id) on delete cascade,
  value public.reaction_value not null,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, anonymous_profile_id)
);

create index if not exists idx_reactions_target_id on public.reactions(target_id);

-- ---------------------------------------------------------
-- 8. reports
-- ---------------------------------------------------------
create type public.report_reason as enum (
  'privacy', 'abuse', 'spam', 'misinformation',
  'solicitation_violation', 'illegal', 'other'
);
create type public.report_status as enum ('pending', 'resolved_normal', 'resolved_hidden', 'resolved_deleted', 'resolved_ban');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type public.reaction_target not null,
  target_id uuid not null,
  reporter_id uuid not null references public.anonymous_profiles(id) on delete cascade,
  reason public.report_reason not null,
  detail text,
  status public.report_status not null default 'pending',
  handled_by_admin_id uuid references public.admin_users(id),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_target_id on public.reports(target_id);

-- ---------------------------------------------------------
-- 9. user_blocks - 작성자 일정 기간/영구 차단
-- ---------------------------------------------------------
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  anonymous_profile_id uuid not null references public.anonymous_profiles(id) on delete cascade,
  blocked_by_admin_id uuid references public.admin_users(id),
  reason text,
  blocked_until timestamptz, -- null이면 영구 차단
  created_at timestamptz not null default now()
);

create index if not exists idx_user_blocks_profile_id on public.user_blocks(anonymous_profile_id);

-- ---------------------------------------------------------
-- 10. banned_words
-- ---------------------------------------------------------
create table if not exists public.banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  applies_to_post boolean not null default true,
  applies_to_comment boolean not null default true,
  applies_to_author_name boolean not null default true,
  created_by_admin_id uuid references public.admin_users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 11. banners
-- ---------------------------------------------------------
create type public.banner_slot as enum (
  'pc_top', 'pc_left', 'pc_right', 'pc_list_middle', 'pc_detail_bottom',
  'mobile_top', 'mobile_list_middle', 'mobile_detail_bottom', 'mobile_sticky_bottom'
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text not null,
  campaign_name text not null,
  pc_image_path text,
  mobile_image_path text,
  link_url text not null,
  slot public.banner_slot not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  priority int not null default 0,
  is_active boolean not null default true,
  total_contract_amount numeric,
  admin_memo text,
  created_by_admin_id uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_start_at on public.banners(start_at);
create index if not exists idx_banners_end_at on public.banners(end_at);
create index if not exists idx_banners_slot_active on public.banners(slot, is_active);

-- ---------------------------------------------------------
-- 12. banner_impressions / banner_clicks
-- ---------------------------------------------------------
create table if not exists public.banner_impressions (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.banners(id) on delete cascade,
  viewer_hash text not null, -- IP 등을 서버 단방향 해시한 값 (원문 저장 안 함)
  created_at timestamptz not null default now()
);

create index if not exists idx_banner_impressions_banner_id on public.banner_impressions(banner_id);

create table if not exists public.banner_clicks (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.banners(id) on delete cascade,
  viewer_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_banner_clicks_banner_id on public.banner_clicks(banner_id);
create index if not exists idx_banner_clicks_dedup on public.banner_clicks(banner_id, viewer_hash, created_at);

-- ---------------------------------------------------------
-- 13. post_views - 중복 조회 방지를 위한 집계 로그(원문 IP 없음)
-- ---------------------------------------------------------
create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  anonymous_profile_id uuid not null references public.anonymous_profiles(id) on delete cascade,
  is_admin_view boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_views_dedup on public.post_views(post_id, anonymous_profile_id, created_at desc);

-- ---------------------------------------------------------
-- 14. site_settings - key/value 운영 설정
-- ---------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by_admin_id uuid references public.admin_users(id),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 15. audit_logs - 관리자 조작 이력 (수치 보정/이관/에디터추천/작성자명 변경 등)
-- ---------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_users(id),
  target_type text not null, -- 'post' | 'comment' | 'banner' | 'category' | 'admin_user' 등
  target_id uuid not null,
  action text not null,       -- 'correction_view' | 'import_view' | 'editor_pick_set' | 'author_name_edit' 등
  reason_code text,
  reason_detail text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);
create index if not exists idx_audit_logs_admin_id on public.audit_logs(admin_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ---------------------------------------------------------
-- updated_at 자동 갱신 트리거 공통 함수
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['anonymous_profiles','admin_users','categories','posts','comments','banners']
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I; create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;
