-- =========================================================
-- 0017_branch_links_and_video.sql
-- 지점 홍보 콘텐츠: SNS/외부 링크를 위한 별도 테이블(branch_links)을 추가한다.
--
-- branch_contacts(전화/카카오 - "문의" 액션)와는 목적이 다르다: branch_links는
-- 인스타그램/블로그/유튜브/홈페이지/기타처럼 상세페이지에 아이콘 줄로 노출되는
-- "홍보" 링크다. branch_media(image/video)와 마찬가지로 앞으로 여러 개의 영상이나
-- 새 SNS 종류가 추가돼도 스키마 변경 없이 행 추가만으로 확장 가능하도록 분리한다.
-- (영상은 이미 branch_media.media_type='video'로 지원되고 있어 별도 테이블이
-- 필요 없다 - branch-videos Storage 버킷과 add_branch_media도 이미 존재한다.)
--
-- 0008 적용 후 실행.
-- =========================================================

create table if not exists public.branch_links (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  type text not null, -- 'instagram' | 'blog' | 'youtube' | 'website' | 'etc'
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branch_links_branch_id on public.branch_links(branch_id);

drop trigger if exists trg_set_updated_at on public.branch_links;
create trigger trg_set_updated_at before update on public.branch_links
  for each row execute function public.set_updated_at();

alter table public.branch_links enable row level security;

-- 공개 조회: 승인+공개 상태인 지점의 링크만 (branch_media/branch_contacts와 동일한 조건).
create policy "public read links of visible branch"
  on public.branch_links for select
  using (
    exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_links.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );
create policy "ga admin read own branch links"
  on public.branch_links for select
  using (public.is_ga_admin_for_branch(branch_id));

create or replace function public.upsert_branch_link(
  p_link_id uuid,
  p_branch_id uuid,
  p_type text,
  p_url text,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing_branch_id uuid;
begin
  if p_link_id is not null then
    select branch_id into v_existing_branch_id from public.branch_links where id = p_link_id;
    if v_existing_branch_id is null then
      raise exception 'LINK_NOT_FOUND';
    end if;
    p_branch_id := v_existing_branch_id;
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  if length(trim(p_type)) = 0 or length(trim(p_url)) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_link_id is null then
    insert into public.branch_links (branch_id, type, url, sort_order)
    values (p_branch_id, trim(p_type), trim(p_url), p_sort_order)
    returning id into v_id;
  else
    update public.branch_links
    set type = trim(p_type), url = trim(p_url), sort_order = p_sort_order
    where id = p_link_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.delete_branch_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id from public.branch_links where id = p_link_id;

  if v_branch_id is null then
    raise exception 'LINK_NOT_FOUND';
  end if;

  if public.current_admin_id() is null and not public.is_ga_admin_for_branch(v_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;

  delete from public.branch_links where id = p_link_id;
end;
$$;

grant execute on function public.upsert_branch_link(uuid, uuid, text, text, int) to authenticated;
grant execute on function public.delete_branch_link(uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리 (실행 후 사용자가 직접 검증)
-- ---------------------------------------------------------
-- select proname from pg_proc where proname in ('upsert_branch_link','delete_branch_link');
-- select tablename from pg_tables where tablename = 'branch_links';
