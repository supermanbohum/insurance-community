-- =========================================================
-- 0057_top_designer_engagement.sql
-- TOP 설계사 좋아요/조회수 - 조회수는 planner_profile_views(0039)와 동일한
-- insert-only 로그 패턴, 좋아요는 이 코드베이스에 처음 도입되는 토글 패턴이다
-- (기존에 좋아요/추천 기능이 전혀 없었음).
-- =========================================================

-- ---------------------------------------------------------
-- 좋아요 - 로그인 필요(익명은 유일성을 강제할 방법이 없어 제외).
-- ---------------------------------------------------------
create table public.top_designer_likes (
  id uuid primary key default gen_random_uuid(),
  top_designer_certification_id uuid not null references public.top_designer_certifications(id) on delete cascade,
  liker_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (top_designer_certification_id, liker_user_id)
);

create index idx_top_designer_likes_cert on public.top_designer_likes(top_designer_certification_id);

alter table public.top_designer_likes enable row level security;

create policy "member reads own top designer like"
  on public.top_designer_likes for select
  using (liker_user_id = public.current_member_id());

create or replace function public.toggle_top_designer_like(p_certification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := public.current_member_id();
  v_liked boolean;
begin
  if v_member_id is null then
    raise exception 'NOT_LOGGED_IN';
  end if;
  if not exists (select 1 from public.top_designer_certifications where id = p_certification_id and status = 'approved') then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.top_designer_likes
    where top_designer_certification_id = p_certification_id and liker_user_id = v_member_id
  ) then
    delete from public.top_designer_likes
    where top_designer_certification_id = p_certification_id and liker_user_id = v_member_id;
    v_liked := false;
  else
    insert into public.top_designer_likes (top_designer_certification_id, liker_user_id)
    values (p_certification_id, v_member_id);
    v_liked := true;
  end if;

  return v_liked;
end;
$$;

grant execute on function public.toggle_top_designer_like(uuid) to authenticated;

-- ---------------------------------------------------------
-- 조회수 - planner_profile_views(0039)와 동일한 insert-only 로그 패턴.
-- ---------------------------------------------------------
create table public.top_designer_views (
  id uuid primary key default gen_random_uuid(),
  top_designer_certification_id uuid not null references public.top_designer_certifications(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index idx_top_designer_views_cert_time on public.top_designer_views(top_designer_certification_id, viewed_at desc);

alter table public.top_designer_views enable row level security;
-- 정책 없음(0039와 동일) - insert/집계 모두 RPC 전용.

create or replace function public.record_top_designer_view(p_certification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.top_designer_certifications where id = p_certification_id and status = 'approved') then
    return;
  end if;
  insert into public.top_designer_views (top_designer_certification_id) values (p_certification_id);
end;
$$;

grant execute on function public.record_top_designer_view(uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- 공개 뷰 재정의 - view_count/like_count를 뒤에 추가(기존 컬럼 순서 유지, CREATE OR
-- REPLACE VIEW는 기존 컬럼을 재정렬/삭제할 수 없어 0056의 SELECT 목록을 그대로 반복한다).
-- ---------------------------------------------------------
create or replace view public.public_top_designer_certifications
with (security_invoker = true) as
select
  c.id,
  c.planner_profile_id,
  c.job_title,
  c.star_tier,
  c.reviewed_at as certified_at,
  c.created_at,
  p.profile_photo_path,
  p.active_region_id,
  p.career_years,
  p.specialties,
  p.self_introduction,
  (select count(*) from public.top_designer_views v where v.top_designer_certification_id = c.id) as view_count,
  (select count(*) from public.top_designer_likes l where l.top_designer_certification_id = c.id) as like_count
from public.top_designer_certifications c
join public.planner_profiles p on p.id = c.planner_profile_id
where c.status = 'approved' and p.status = 'approved' and p.is_hidden = false and p.withdrawn_at is null;

grant select on public.public_top_designer_certifications to anon, authenticated;
