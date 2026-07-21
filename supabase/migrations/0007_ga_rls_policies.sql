-- =========================================================
-- 0007_ga_rls_policies.sql
-- GA/지점 스키마 RLS 정책 + 헬퍼 함수
-- posts와 동일한 원칙: 공개 read만 정책으로 열고, 쓰기는 전부 0008의
-- SECURITY DEFINER 함수로만 수행한다 (INSERT/UPDATE/DELETE 정책 없음 = 기본 전면 차단).
-- 0006 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- A. 헬퍼 함수
-- ---------------------------------------------------------

-- 현재 로그인한 플랫폼 관리자의 admin_users.id (활성 계정만)
create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.admin_users where auth_user_id = auth.uid() and is_active = true;
$$;

-- 현재 로그인한 GA 관리자의 ga_admin_users 행 (활성 계정만)
create or replace function public.current_ga_admin()
returns public.ga_admin_users
language sql
stable
security definer
set search_path = public
as $$
  select * from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
$$;

-- 현재 로그인한 GA 관리자가 특정 지점을 관리할 권한이 있는지
-- (branch_id가 지정된 계정이면 해당 지점만, null이면 소속 회사의 전 지점)
create or replace function public.is_ga_admin_for_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ga_admin_users ga
    join public.ga_branch b on b.id = p_branch_id
    where ga.auth_user_id = auth.uid()
      and ga.is_active = true
      and (ga.branch_id = p_branch_id or (ga.branch_id is null and ga.ga_company_id = b.ga_company_id))
  );
$$;

-- ---------------------------------------------------------
-- B. RLS 활성화
-- ---------------------------------------------------------
alter table public.regions enable row level security;
alter table public.insurers enable row level security;
alter table public.ga_company enable row level security;
alter table public.ga_branch enable row level security;
alter table public.branch_media enable row level security;
alter table public.branch_contacts enable row level security;
alter table public.branch_recruit enable row level security;
alter table public.branch_event enable row level security;
alter table public.branch_insurers enable row level security;
alter table public.branch_views enable row level security;
alter table public.branch_contact_clicks enable row level security;
alter table public.ga_admin_users enable row level security;

-- ---------------------------------------------------------
-- C. regions / insurers - 참조 마스터, 공개 읽기
-- ---------------------------------------------------------
create policy "public read regions"
  on public.regions for select
  using (true);

create policy "public read active insurers"
  on public.insurers for select
  using (is_active = true);

-- ---------------------------------------------------------
-- D. ga_company
--    공개: approval_status='approved'인 회사만. GA 관리자: 본인 소속 회사는 승인 상태 무관 조회
--    (심사 대기 중에도 본인 정보는 미리 채워넣을 수 있어야 하므로).
-- ---------------------------------------------------------
create policy "public read approved ga_company"
  on public.ga_company for select
  using (approval_status = 'approved');

create policy "ga admin read own company"
  on public.ga_company for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true and ga.ga_company_id = ga_company.id
    )
  );

-- ---------------------------------------------------------
-- E. ga_branch
--    공개 노출은 지점 자체 상태뿐 아니라 소속 GA의 승인 상태에도 종속된다.
--    (미승인/반려/중지된 GA의 지점은 branch.status와 무관하게 비공개)
-- ---------------------------------------------------------
create policy "public read visible ga_branch"
  on public.ga_branch for select
  using (
    status = 'visible' and deleted_at is null
    and exists (
      select 1 from public.ga_company c
      where c.id = ga_branch.ga_company_id and c.approval_status = 'approved'
    )
  );

create policy "ga admin read own branch"
  on public.ga_branch for select
  using (public.is_ga_admin_for_branch(id));

-- ---------------------------------------------------------
-- F. branch_media / branch_contacts / branch_recruit / branch_event / branch_insurers
--    공개 노출 여부는 부모 ga_branch가 공개 상태인지에 종속.
--    GA 관리자는 본인 소속 지점 데이터는 상태 무관 조회.
-- ---------------------------------------------------------
create policy "public read media of visible branch"
  on public.branch_media for select
  using (
    exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_media.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );
create policy "ga admin read own branch media"
  on public.branch_media for select
  using (public.is_ga_admin_for_branch(branch_id));

create policy "public read contacts of visible branch"
  on public.branch_contacts for select
  using (
    exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_contacts.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );
create policy "ga admin read own branch contacts"
  on public.branch_contacts for select
  using (public.is_ga_admin_for_branch(branch_id));

create policy "public read active recruit of visible branch"
  on public.branch_recruit for select
  using (
    is_active = true
    and (end_at is null or end_at > now())
    and exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_recruit.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );
create policy "ga admin read own branch recruit"
  on public.branch_recruit for select
  using (public.is_ga_admin_for_branch(branch_id));

create policy "public read active event of visible branch"
  on public.branch_event for select
  using (
    is_active = true
    and exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_event.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );
create policy "ga admin read own branch event"
  on public.branch_event for select
  using (public.is_ga_admin_for_branch(branch_id));

create policy "public read insurers of visible branch"
  on public.branch_insurers for select
  using (
    exists (
      select 1 from public.ga_branch b join public.ga_company c on c.id = b.ga_company_id
      where b.id = branch_insurers.branch_id and b.status = 'visible' and c.approval_status = 'approved'
    )
  );
create policy "ga admin read own branch insurers"
  on public.branch_insurers for select
  using (public.is_ga_admin_for_branch(branch_id));

-- ---------------------------------------------------------
-- G. branch_views - 조회 로그. 본인 조회 기록만 삽입 가능(post_views와 동일 패턴).
--    통계 카드('조회수'/'오늘 조회수') 조회를 위해 GA 관리자에게는 select도 허용.
-- ---------------------------------------------------------
create policy "insert own branch view"
  on public.branch_views for insert
  with check (anonymous_profile_id = public.current_profile_id());

create policy "ga admin read own branch views"
  on public.branch_views for select
  using (public.is_ga_admin_for_branch(branch_id));

-- ---------------------------------------------------------
-- H. branch_contact_clicks - 문의 클릭 로그. 익명 사용자 누구나 삽입 가능(집계 전용,
--    개인 식별값을 저장하지 않으므로 본인 여부를 따지지 않는다).
--    GA 관리자는 본인 지점 클릭 통계만 조회.
-- ---------------------------------------------------------
create policy "insert branch contact click"
  on public.branch_contact_clicks for insert
  with check (true);

create policy "ga admin read own branch contact clicks"
  on public.branch_contact_clicks for select
  using (public.is_ga_admin_for_branch(branch_id));

-- ---------------------------------------------------------
-- I. ga_admin_users - 본인 행만 조회 가능 (소속 회사/지점 스코프 확인용).
--    플랫폼 관리자의 회원관리 화면은 service role(admin client)로 접근.
-- ---------------------------------------------------------
create policy "ga admin read own account"
  on public.ga_admin_users for select
  using (auth_user_id = auth.uid());

-- ---------------------------------------------------------
-- J. ga_company / ga_branch / branch_* 에 INSERT/UPDATE/DELETE 정책을 두지 않음.
--    모든 쓰기는 0008의 SECURITY DEFINER 함수(create_ga_company, update_branch,
--    upsert_branch_contact 등)로만 이루어진다 - posts/comments와 동일한 원칙.
-- ---------------------------------------------------------
