-- =========================================================
-- 0052_public_read_fixes_and_platform_stats.sql
-- 두 가지 버그 수정 + 홈/관리자 공용 핵심 통계 RPC 신설:
--
--  1) "설계사 찾기"가 승인된 설계사가 101명 있어도 0건으로 보이던 버그.
--     public_planner_profiles 뷰가 security_invoker=true라 anon 조회 시
--     기반 테이블 planner_profiles의 RLS가 그대로 적용되는데, 그 RLS엔
--     "본인만 조회 가능" 정책만 있고 anon(비로그인/제3자)이 승인+공개 상태
--     행을 읽을 수 있는 정책이 없었다 - 뷰의 where절은 맞았지만 애초에
--     기반 테이블에서 행이 다 걸러진 뒤였다.
--  2) 홈 화면 좌측 배너가 관리자에서 정상 설정해도 전혀 안 보이던 버그.
--     public_banners 뷰도 동일한 구조(security_invoker=true)인데 banners
--     테이블에는 "일반 사용자는 정책 없음(전면 비공개)"로 설계돼 있어
--     public_banners를 anon으로 조회하면 항상 0행이었다.
--
--  두 경우 모두 뷰 자체(where절/grant)는 올바르게 작성돼 있었다 - 기반
--  테이블에 뷰의 조건과 동일한 select 정책을 추가하는 것으로 고친다
--  (ga_branch/ga_company가 이미 쓰고 있는, 이 코드베이스의 정상 동작하는
--  패턴과 동일하다).
--
--  3) get_platform_core_stats() - "등록 지점/등록 설계사/오늘 신규" 숫자를
--     홈 화면과 관리자 대시보드가 완전히 동일한 로직으로 계산하도록 하나의
--     RPC로 통합한다. "등록 설계사"는 이제 (승인된 지점이 등록 시 선택한
--     예상 설계사 인원 합계) + (직접 등록해 승인+공개된 설계사 수)로 계산한다.
--     안전하게 집계값만 반환하므로(개별 행 노출 없음) anon에도 grant한다.
-- =========================================================

-- ---------------------------------------------------------
-- A. planner_profiles - 승인+공개 상태 행은 누구나 읽을 수 있어야
--    public_planner_profiles 뷰가 의도대로 동작한다. 기존 "본인만 조회"
--    정책은 그대로 둔다(여러 permissive 정책은 OR로 합쳐진다).
-- ---------------------------------------------------------
drop policy if exists "public read approved visible planner profiles" on public.planner_profiles;
create policy "public read approved visible planner profiles"
  on public.planner_profiles for select
  using (status = 'approved' and is_hidden = false and withdrawn_at is null);

-- ---------------------------------------------------------
-- B. banners - 활성 배너는 누구나 읽을 수 있어야 public_banners 뷰가
--    의도대로 동작한다. 원본 테이블 자체를 직접 조회해도 활성 배너의
--    비민감 노출 필드(이미지 경로/링크/슬롯/우선순위)만 있어 노출에
--    문제가 없다.
-- ---------------------------------------------------------
drop policy if exists "public read active banners" on public.banners;
create policy "public read active banners"
  on public.banners for select
  using (is_active = true and start_at <= now() and end_at >= now());

-- ---------------------------------------------------------
-- C. get_platform_core_stats() - 홈/관리자 공용 핵심 통계.
-- ---------------------------------------------------------
create or replace function public.get_platform_core_stats()
returns table (
  approved_ga_count bigint,
  approved_branch_count bigint,
  registered_planner_count bigint,
  today_new_ga_count bigint,
  today_new_branch_count bigint,
  today_new_planner_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  return query
  select
    (select count(*) from public.ga_company where approval_status = 'approved'),
    (
      select count(*)
      from public.ga_branch b
      join public.ga_company c on c.id = b.ga_company_id
      where b.status = 'visible' and b.registration_status = 'approved' and c.approval_status = 'approved'
    ),
    (
      coalesce((
        select sum(b.planner_count)
        from public.ga_branch b
        join public.ga_company c on c.id = b.ga_company_id
        where b.status = 'visible' and b.registration_status = 'approved' and c.approval_status = 'approved'
      ), 0)
      +
      (select count(*) from public.planner_profiles where status = 'approved' and is_hidden = false and withdrawn_at is null)
    ),
    (select count(*) from public.ga_company where approval_status = 'approved' and reviewed_at >= v_today_start),
    (select count(*) from public.branch_registrations where request_type = 'create' and status = 'approved' and reviewed_at >= v_today_start),
    (select count(*) from public.planner_profiles where status = 'approved' and reviewed_at >= v_today_start);
end;
$$;

grant execute on function public.get_platform_core_stats() to anon, authenticated;

-- ---------------------------------------------------------
-- D. get_today_site_traffic_stats()(0051)를 홈 화면(anon)에서도 쓸 수
--    있도록 grant를 넓힌다 - 집계값만 반환해 노출 문제 없음.
-- ---------------------------------------------------------
grant execute on function public.get_today_site_traffic_stats() to anon, authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from public.get_platform_core_stats();
