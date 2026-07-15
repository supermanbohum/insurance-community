-- =========================================================
-- 0002_rls_policies.sql
-- RLS 정책 + 헬퍼 함수 + 익명 프로필 자동 생성 트리거
-- =========================================================

-- ---------------------------------------------------------
-- A. auth.users(익명 사용자) 생성 시 anonymous_profiles 자동 생성
-- ---------------------------------------------------------
create or replace function public.handle_new_anonymous_user()
returns trigger
security definer
set search_path = public
as $$
begin
  if (new.is_anonymous is true) then
    insert into public.anonymous_profiles (auth_user_id)
    values (new.id)
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_handle_new_anonymous_user on auth.users;
create trigger trg_handle_new_anonymous_user
  after insert on auth.users
  for each row execute function public.handle_new_anonymous_user();

-- ---------------------------------------------------------
-- B. 헬퍼 함수: 현재 로그인한 익명 사용자의 anonymous_profiles.id
-- ---------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.anonymous_profiles where auth_user_id = auth.uid();
$$;

-- 현재 사용자가 차단 상태인지 확인
create or replace function public.is_current_user_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_blocked and (blocked_until is null or blocked_until > now())
     from public.anonymous_profiles
     where auth_user_id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------
-- C. RLS 활성화
-- ---------------------------------------------------------
alter table public.anonymous_profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.banned_words enable row level security;
alter table public.banners enable row level security;
alter table public.banner_impressions enable row level security;
alter table public.banner_clicks enable row level security;
alter table public.post_views enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------
-- D. anonymous_profiles
--    본인 행만 조회 가능. 원본 UUID는 애플리케이션에서 응답에 포함하지 않는다.
-- ---------------------------------------------------------
create policy "select own profile"
  on public.anonymous_profiles for select
  using (auth_user_id = auth.uid());

create policy "update own profile (last_author_name only, app-level enforced)"
  on public.anonymous_profiles for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ---------------------------------------------------------
-- E. categories - 공개 읽기만 허용. 쓰기는 서버(관리자 API, service role)만.
-- ---------------------------------------------------------
create policy "public read active categories"
  on public.categories for select
  using (is_active = true);

-- ---------------------------------------------------------
-- F. posts
--    - 공개 상태(status='visible', deleted_at is null) 글만 조회
--    - 직접 INSERT/UPDATE는 막고, 모든 쓰기는 0003의 SECURITY DEFINER 함수로만 수행
--      -> 클라이언트가 organic_* / correction_* 등 민감 컬럼을 직접 조작하지 못하게 원천 차단
-- ---------------------------------------------------------
create policy "public read visible posts"
  on public.posts for select
  using (status = 'visible' and deleted_at is null);

create policy "author can read own posts regardless of status"
  on public.posts for select
  using (author_id = public.current_profile_id());

-- INSERT/UPDATE/DELETE 정책을 만들지 않음 = 기본적으로 전면 차단.
-- 글 작성/수정/소프트삭제는 public.create_post() / public.update_post() / public.soft_delete_post() 함수로만 가능.

-- ---------------------------------------------------------
-- G. post_images - 게시글 조회 가능 여부에 종속
-- ---------------------------------------------------------
create policy "read images of visible posts"
  on public.post_images for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_images.post_id
        and (p.status = 'visible' or p.author_id = public.current_profile_id())
        and p.deleted_at is null
    )
  );

-- ---------------------------------------------------------
-- H. comments - posts와 동일한 원칙 (쓰기는 함수 경유)
-- ---------------------------------------------------------
create policy "public read visible comments"
  on public.comments for select
  using (
    status = 'visible'
    and deleted_at is null
    and exists (select 1 from public.posts p where p.id = comments.post_id and p.status = 'visible')
  );

create policy "author can read own comments"
  on public.comments for select
  using (author_id = public.current_profile_id());

-- ---------------------------------------------------------
-- I. reactions - 본인 반응만 조회 가능. 쓰기는 toggle_reaction() 함수로만.
-- ---------------------------------------------------------
create policy "read own reactions"
  on public.reactions for select
  using (anonymous_profile_id = public.current_profile_id());

-- ---------------------------------------------------------
-- J. reports - 본인이 신고한 목록만 조회 가능(신고자 목록 자체는 관리자만 service role로 조회).
--    신고 등록은 직접 INSERT 허용(민감 조작 아님), 단 본인 명의로만.
-- ---------------------------------------------------------
create policy "insert own report"
  on public.reports for insert
  with check (
    reporter_id = public.current_profile_id()
    and not public.is_current_user_blocked()
  );

create policy "read own reports"
  on public.reports for select
  using (reporter_id = public.current_profile_id());

-- ---------------------------------------------------------
-- K. user_blocks / banned_words / banners / banner_impressions(select) /
--    site_settings / audit_logs / admin_users
--    -> 일반 사용자는 정책을 두지 않아 기본적으로 전면 비공개.
--       관리자 페이지는 service role(admin client)로 접근하며 RLS를 우회한다.
--       (service role 사용 전 반드시 애플리케이션 레벨에서 관리자 인증/권한을 검증한다.)
-- ---------------------------------------------------------

-- 배너는 활성 노출 중인 것만 공개 조회 허용 (금액/메모 등 민감 컬럼은
-- 뷰(public.public_banners)를 통해서만 노출하여 클라이언트에 원본 테이블 select를 주지 않는다)
create view public.public_banners
with (security_invoker = true) as
select
  id, pc_image_path, mobile_image_path, link_url, slot, priority
from public.banners
where is_active = true
  and start_at <= now()
  and end_at >= now();

grant select on public.public_banners to anon, authenticated;

-- post_views: 본인 조회 로그만 삽입 가능(조회수 집계용), 조회는 불가(집계는 서버 함수가 처리)
create policy "insert own post view"
  on public.post_views for insert
  with check (anonymous_profile_id = public.current_profile_id());
