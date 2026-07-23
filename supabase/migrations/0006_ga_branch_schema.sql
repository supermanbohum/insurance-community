-- =========================================================
-- 0006_ga_branch_schema.sql
-- 보험맵 GA/지점 스키마 (지점 중심 설계)
-- ga_company는 신원(이름/대표자/소개)만 갖는 얇은 부모이고,
-- 주소/연락처/미디어/조회수/채용/이벤트 등 실제 노출 데이터는
-- ga_branch와 그 자식 테이블에 둔다 (사용자가 실제로 도착하는 페이지가 지점 상세이기 때문).
-- 0001~0005 적용 후 실행.
-- =========================================================

-- ---------------------------------------------------------
-- 1. regions - 시도/시군구 참조 마스터 (seed로 관리, 0009에서 데이터 삽입)
-- ---------------------------------------------------------
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  sido_code text not null,
  sido_name text not null,
  sigungu_code text, -- 세종특별자치시처럼 시군구 세분이 없는 경우 null
  sigungu_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (sido_code, sigungu_code)
);

create index if not exists idx_regions_sido_code on public.regions(sido_code);

-- ---------------------------------------------------------
-- 2. insurers - 취급 원수사 마스터 (seed로 관리)
-- ---------------------------------------------------------
create table if not exists public.insurers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. ga_company - GA 본사 (신원 정보만 보유하는 얇은 부모)
--    승인 프로세스: 플랫폼 관리자가 상태 변경만으로 승인/반려/중지 처리한다.
--    approval_status = 'approved'인 회사만 공개 노출되며, 소속 지점의 공개 여부도
--    이 값에 종속된다 (0007 RLS 참고). 신규 등록은 항상 'pending'으로 시작한다.
-- ---------------------------------------------------------
create table if not exists public.ga_company (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  ceo_name text,
  description text,
  logo_path text,

  -- 승인(approval_status='approved') 이후에도 관리자가 임시로 노출을 껐다 켤 수 있는 스위치.
  status text not null default 'visible' check (status in ('visible', 'hidden')),

  -- '공식 인증 GA' 배지 - 승인 여부와는 별개의 신뢰 배지. 플랫폼 관리자만 부여 (0008의 verify_ga_company).
  is_verified boolean not null default false,
  verified_at timestamptz,
  -- 향후 인증 정책이 바뀌어도(예: 등급제, 재인증 만료 등) 누가/언제 부여했는지 추적할 수 있도록 남겨둔다.
  verified_by_admin_id uuid references public.admin_users(id),

  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  approval_reason text, -- 반려(rejected)/중지(suspended) 사유
  reviewed_by_admin_id uuid references public.admin_users(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ga_company_approval_status on public.ga_company(approval_status);
create index if not exists idx_ga_company_name on public.ga_company(name);
create index if not exists idx_ga_company_created_at on public.ga_company(created_at desc);

-- ---------------------------------------------------------
-- 4. ga_branch - 지점 (허브 테이블). 검색/지도/필터에 항상 필요한
--    주소·좌표는 자식 테이블로 빼지 않고 여기 직접 둔다.
-- ---------------------------------------------------------
create table if not exists public.ga_branch (
  id uuid primary key default gen_random_uuid(),
  ga_company_id uuid not null references public.ga_company(id) on delete cascade,
  region_id uuid references public.regions(id),

  -- 공개 상세페이지(/branch/[slug]) 라우팅 키. GA는 더 이상 자체 상세페이지가 없고
  -- 검색/지도/즐겨찾기/상세페이지 모두 지점(Branch) 기준으로 동작하므로 여기가 유일한 slug다.
  slug text not null unique,

  name text not null, -- 본부/지점명
  manager_name text, -- 대표자(지점장/본부장). ga_company.ceo_name과 별개 - 지점마다 다를 수 있다.

  address text not null,
  address_detail text,
  lat double precision,
  lng double precision,

  -- 소개 텍스트 (스펙: 회사소개/교육/복지/DB지원/정착지원/분위기)
  intro_text text,
  education_info text,
  welfare_info text,
  db_support_info text,
  settlement_support_info text,
  atmosphere_info text, -- 분위기 - 지점 고유의 근무 분위기/문화 소개

  planner_count int, -- 설계사 수
  parking_available boolean,
  visit_consult_available boolean,
  business_hours text, -- 영업시간

  -- 지점 운영 형태 - 'direct'(직영) | 'branch'(지사). GA가 아니라 지점 단위로 다를 수 있다.
  operation_type text not null default 'branch' check (operation_type in ('direct', 'branch')),
  -- 이 지점이 소속 GA의 본사(headquarters)인지 여부. GA당 최대 1개 지점만 true.
  is_headquarters boolean not null default false,

  -- 조회수 3분할 (posts와 동일 패턴 - organic은 record_branch_view()로만 증가,
  -- imported/correction은 0008의 관리자 전용 함수로만 수정하고 audit_logs에 기록)
  organic_view_count bigint not null default 0,
  imported_view_count bigint not null default 0,
  correction_view_count bigint not null default 0,

  is_recommended boolean not null default false,
  recommended_rank int,

  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_ga_branch_company_id on public.ga_branch(ga_company_id);
create index if not exists idx_ga_branch_region_id on public.ga_branch(region_id);
create index if not exists idx_ga_branch_status on public.ga_branch(status);
create index if not exists idx_ga_branch_created_at on public.ga_branch(created_at desc);
create index if not exists idx_ga_branch_view_count on public.ga_branch(organic_view_count desc);
create index if not exists idx_ga_branch_name on public.ga_branch(name);

-- ---------------------------------------------------------
-- 5. branch_media - 대표사진/사무실사진/홍보영상 (지점 소유, 통합 관리)
--    영상은 유튜브 등 외부 링크를 허용하기 위해 source로 storage/external을 구분한다.
-- ---------------------------------------------------------
create type public.branch_media_type as enum ('image_main', 'image_office', 'video');
create type public.branch_media_source as enum ('storage', 'external');

create table if not exists public.branch_media (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  media_type public.branch_media_type not null,
  source public.branch_media_source not null default 'storage',
  value text not null, -- storage_path 또는 외부 URL
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_branch_media_branch_id on public.branch_media(branch_id);

-- ---------------------------------------------------------
-- 6. branch_contacts - 연락 채널 (type/value 자유형 구조)
--    enum으로 고정하지 않고 type을 text로 두어, 카카오/홈페이지/인스타그램/
--    유튜브/블로그 등 새 채널을 스키마 변경 없이 행 추가만으로 지원한다.
--    표시용 아이콘/라벨 매핑은 애플리케이션 레이어(lib/branch/contact-types.ts)에서 담당.
-- ---------------------------------------------------------
create table if not exists public.branch_contacts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  type text not null, -- 'phone' | 'phone_recruit' | 'kakao' | 'homepage' | 'instagram' | 'youtube' | 'blog' | ...
  value text not null, -- 전화번호/URL 원문
  label text, -- 표시용 커스텀 라벨 (선택)
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branch_contacts_branch_id on public.branch_contacts(branch_id);

-- ---------------------------------------------------------
-- 7. branch_recruit - 공식채용 (GA 관리자가 작성, /jobs '공식채용' 탭의 소스)
-- ---------------------------------------------------------
create table if not exists public.branch_recruit (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  title text not null,
  content text not null,
  employment_type text, -- '정규직' | '위촉직' | '계약직' 등 (자유 텍스트, app에서 옵션 제공)
  is_active boolean not null default true,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branch_recruit_branch_id on public.branch_recruit(branch_id);
create index if not exists idx_branch_recruit_active on public.branch_recruit(is_active, end_at);

-- ---------------------------------------------------------
-- 8. branch_event - 지점이 등록한 이벤트 (/events 페이지가 전 지점 집계)
-- ---------------------------------------------------------
create table if not exists public.branch_event (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  title text not null,
  content text not null,
  image_path text,
  is_active boolean not null default true,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branch_event_branch_id on public.branch_event(branch_id);
create index if not exists idx_branch_event_active on public.branch_event(is_active, end_at);

-- ---------------------------------------------------------
-- 9. branch_insurers - 지점 ↔ 원수사 (취급 원수사, M:N)
-- ---------------------------------------------------------
create table if not exists public.branch_insurers (
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  insurer_id uuid not null references public.insurers(id) on delete cascade,
  primary key (branch_id, insurer_id)
);

create index if not exists idx_branch_insurers_insurer_id on public.branch_insurers(insurer_id);

-- ---------------------------------------------------------
-- 10. branch_views - 중복 조회 방지용 집계 로그 (post_views와 동일 패턴)
-- ---------------------------------------------------------
create table if not exists public.branch_views (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  anonymous_profile_id uuid not null references public.anonymous_profiles(id) on delete cascade,
  is_admin_view boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_branch_views_dedup on public.branch_views(branch_id, anonymous_profile_id, created_at desc);
-- '오늘 조회수' 통계 카드 조회용
create index if not exists idx_branch_views_branch_created on public.branch_views(branch_id, created_at desc);

-- ---------------------------------------------------------
-- 11. branch_contact_clicks - 전화/카카오/홈페이지 등 문의 클릭 로그
--     GA 관리자 통계 카드('문의 클릭수')의 데이터 소스.
--     contact_type을 함께 저장해, 연결된 branch_contacts 행이 삭제돼도 통계 이력은 남는다.
-- ---------------------------------------------------------
create table if not exists public.branch_contact_clicks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  contact_id uuid references public.branch_contacts(id) on delete set null,
  contact_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_branch_contact_clicks_branch_created on public.branch_contact_clicks(branch_id, created_at desc);

-- ---------------------------------------------------------
-- 12. ga_admin_users - GA 관리자 계정 (외부 사업자, admin_users와 완전 분리)
--     branch_id가 null이면 소속 ga_company_id의 모든 지점을 관리, 지정되면 해당 지점만 관리.
-- ---------------------------------------------------------
create table if not exists public.ga_admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  ga_company_id uuid not null references public.ga_company(id) on delete cascade,
  branch_id uuid references public.ga_branch(id) on delete cascade,
  email text not null unique,
  display_name text not null default 'GA 관리자',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ga_admin_users_company_id on public.ga_admin_users(ga_company_id);
create index if not exists idx_ga_admin_users_branch_id on public.ga_admin_users(branch_id);

-- ---------------------------------------------------------
-- updated_at 자동 갱신 트리거 (0001의 public.set_updated_at 재사용)
-- ---------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['ga_company','ga_branch','branch_contacts','branch_recruit','branch_event','ga_admin_users']
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I; create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;
