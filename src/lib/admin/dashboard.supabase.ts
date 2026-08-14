import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export interface PlannerStats {
  /** 등록 설계사 - 철회하지 않은 전체 프로필 수(승인 대기/반려 포함). */
  registered: number;
  /** 승인 설계사 - 관리자 승인이 완료된 프로필 수(비공개 처리된 것도 포함). */
  approved: number;
  /** 공개중 설계사 - 실제로 "설계사 찾기"에 노출 중인 수(public_planner_profiles와 동일 기준). */
  visible: number;
  /** 직전연봉 인증 설계사 - income_verified 배지가 승인된 수. */
  incomeVerified: number;
  /** 오늘 신규 설계사 - 오늘 승인된 수(가입일이 아니라 승인일 기준). */
  todayNew: number;
}

export interface PendingApprovalCounts {
  ga: number;
  branchCreate: number;
  planner: number;
  topDesigner: number;
  salaryRanking: number;
  /** 설계사 지점 연결 심사 대기(branch_planner_registrations). 주체는 지점 관리자이고
   * 운영팀은 예비 경로다(오너 지시 2026-08-14) - 그래도 대기가 쌓이면 운영팀 눈에 보여야 한다. */
  plannerLink: number;
}

export interface RecentBranchItem {
  id: string;
  slug: string;
  name: string;
  gaCompanyName: string;
  createdAt: string;
}

export interface RecentPlannerItem {
  id: string;
  name: string;
  careerYears: number;
  regionLabel: string;
  createdAt: string;
}

export interface TopBranchItem {
  id: string;
  slug: string;
  name: string;
  viewCount: number;
}

export interface TopPlannerItem {
  id: string;
  name: string;
  regionLabel: string;
  viewCount: number;
}

export interface DashboardStats {
  // 메인 KPI(4종) - "등록"이라는 라벨이어도 실제로는 승인/공개 등 서비스에 실제
  // 반영된 상태만 센다(집계 기준을 approval_status/registration_status/status에
  // 맞춰 통일 - 이전에는 등록만 해도, 심지어 미승인 GA 소속 지점도 카운트됐었다).
  approvedBranchCount: number;
  registeredPlannerCount: number;
  todayNewApprovedCount: number;
  todayVisitorCount: number;

  // 보조 통계
  approvedGaCount: number;
  todayViewCount: number;
  todayContactClickCount: number;
  activeRecruitCount: number;
  last7DaysContactClickCount: number;

  // 오늘 신규 승인 세부 내역(GA/지점/설계사 각각) - 메인 KPI 합계의 근거를 보여준다.
  todayNewBreakdown: { ga: number; branch: number; planner: number };

  plannerStats: PlannerStats;
  pendingApprovalCounts: PendingApprovalCounts;

  pendingGaList: Database['public']['Tables']['ga_company']['Row'][];
  recentGaList: Database['public']['Tables']['ga_company']['Row'][];
  recentBranches: RecentBranchItem[];
  recentPlanners: RecentPlannerItem[];

  topBranches: TopBranchItem[];
  topPlanners: TopPlannerItem[];
}

/** "오늘"은 한국 표준시(KST) 기준 하루로 계산한다 - Vercel 서버는 UTC로 돌아가서
 * 단순 new Date().setHours(0,0,0,0)를 쓰면 자정~오전 9시(KST) 사이엔 "오늘"이
 * 실제로는 어제 UTC 날짜로 계산되는 버그가 있었다. */
function startOfTodayKstIso(): string {
  const nowUtc = new Date();
  const kstNow = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  kstNow.setUTCHours(0, 0, 0, 0);
  return new Date(kstNow.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function regionLabel(region: { sido_name: string; sigungu_name: string | null } | null | undefined): string {
  if (!region) return '지역 미상';
  return region.sigungu_name ? `${region.sido_name} ${region.sigungu_name}` : region.sido_name;
}

/**
 * 승인 대기 알림 전용 - 대시보드 페이지뿐 아니라 관리자 레이아웃(사이드바 배지)에서도
 * 매 페이지 로드마다 가볍게 호출되므로, getDashboardStats() 전체를 부르지 않고
 * 이 3개 카운트만 별도로 뗀다.
 */
export async function getPendingApprovalCounts(): Promise<PendingApprovalCounts> {
  const supabase = createAdminClient();

  const [ga, branchCreate, planner, topDesigner, salaryRanking, plannerLink] = await Promise.all([
    supabase.from('ga_company').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase
      .from('branch_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('request_type', 'create')
      .eq('status', 'pending'),
    supabase
      .from('planner_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review')
      .is('withdrawn_at', null),
    supabase.from('top_designer_certifications').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('salary_ranking_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase
      .from('branch_planner_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
  ]);

  return {
    ga: ga.count ?? 0,
    branchCreate: branchCreate.count ?? 0,
    planner: planner.count ?? 0,
    topDesigner: topDesigner.count ?? 0,
    salaryRanking: salaryRanking.count ?? 0,
    plannerLink: plannerLink.count ?? 0,
  };
}

/**
 * 대시보드 요약 통계. admin_users는 RLS로 이 값들에 접근할 수 없으므로
 * (특히 pending 상태 ga_company, 전체 site_visits/branch_contact_clicks 등)
 * service role client로 조회한다. 호출 전 requireAdmin()으로 세션을 검증해야 한다.
 *
 * 메인 KPI 4종(승인GA/승인지점/등록설계사/오늘신규)은 get_platform_core_stats() RPC
 * 하나를 홈 화면(getHomeStats())과 그대로 공유한다 - 관리자와 홈이 각자 SQL을 따로
 * 작성하면 나중에 기준이 어긋나기 쉬워, 숫자 계산 로직 자체를 한 곳(RPC)에만 둔다.
 * "등록 설계사"는 이제 (승인된 지점이 등록 시 선택한 예상 설계사 인원 합계) + (직접
 * 등록해 승인·공개된 설계사 수)다 - 아래 plannerStats.registered(개별 프로필 원본
 * 등록 수)와는 다른 개념이니 혼동하지 않는다.
 *
 * 나머지 집계 기준:
 * - 설계사 "공개" = public_planner_profiles 뷰와 동일(status='approved' AND
 *   is_hidden=false AND withdrawn_at is null)
 * - "오늘 신규"는 생성일(created_at)이 아니라 승인일(reviewed_at) 기준
 *
 * PostgREST의 embedded-resource 필터(`fk!inner(...)`)는 이 저장소가 수기로 관리하는
 * Database 타입에서 신뢰성 있게 타입체크되지 않아, GA↔지점처럼 두 테이블을 걸쳐야 하는
 * 조건(최근 등록 지점 표시용 GA 이름 조인 등)은 "먼저 승인된 GA id 목록을 가져온 뒤
 * .in()으로 좁히는" 2단계 방식으로 푼다.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const todayStart = startOfTodayKstIso();

  const [
    coreStats,
    approvedGaRows,
    registeredPlanner,
    approvedPlanner,
    visiblePlanner,
    incomeVerifiedPlanner,
    siteTraffic,
    clicksToday,
    activeRecruits,
    clicksLast7Days,
    pendingApprovalCounts,
    pendingGa,
    recentPlannersRaw,
    topBranchRanking,
    topPlannerRanking,
  ] = await Promise.all([
    supabase.rpc('get_platform_core_stats'),
    supabase.from('ga_company').select('id, name').eq('approval_status', 'approved'),
    supabase.from('planner_profiles').select('id', { count: 'exact', head: true }).is('withdrawn_at', null),
    supabase
      .from('planner_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .is('withdrawn_at', null),
    supabase.from('public_planner_profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('planner_badges')
      .select('id', { count: 'exact', head: true })
      .eq('badge_type_code', 'income_verified')
      .eq('status', 'approved'),
    supabase.rpc('get_today_site_traffic_stats'),
    supabase.from('branch_contact_clicks').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('branch_recruit').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('branch_contact_clicks').select('id', { count: 'exact', head: true }).gte('created_at', daysAgoIso(7)),
    getPendingApprovalCounts(),
    supabase
      .from('ga_company')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10),
    supabase
      .from('planner_profiles')
      .select('id, name, career_years, active_region_id, created_at')
      .eq('status', 'approved')
      .eq('is_hidden', false)
      .is('withdrawn_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.rpc('list_monthly_top_branches', { p_limit: 5 }),
    supabase.rpc('list_monthly_top_planner_profiles', { p_limit: 5 }),
  ]);

  const core = coreStats.data?.[0] ?? {
    approved_ga_count: 0,
    approved_branch_count: 0,
    registered_planner_count: 0,
    today_new_ga_count: 0,
    today_new_branch_count: 0,
    today_new_planner_count: 0,
  };

  const approvedGaList = approvedGaRows.data ?? [];
  const approvedGaIds = approvedGaList.map((g) => g.id);
  const gaNameMap = new Map(approvedGaList.map((g) => [g.id, g.name]));

  // 승인된 GA가 하나도 없으면(초기 상태 등) .in()에 빈 배열을 넘기지 않고 바로 빈 결과로
  // 처리한다 - PostgREST 버전에 따라 빈 배열 .in()이 예외를 던질 수 있어 직접 방어한다.
  const [recentGa, recentBranchesRaw] =
    approvedGaIds.length === 0
      ? [
          { data: [] as Database['public']['Tables']['ga_company']['Row'][] },
          { data: [] as { id: string; slug: string; name: string; ga_company_id: string; created_at: string }[] },
        ]
      : await Promise.all([
          supabase
            .from('ga_company')
            .select('*')
            .eq('approval_status', 'approved')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('ga_branch')
            .select('id, slug, name, ga_company_id, created_at')
            .eq('status', 'visible')
            .eq('registration_status', 'approved')
            .in('ga_company_id', approvedGaIds)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

  // TOP5 랭킹은 id/조회수만 반환되므로 표시용 정보(이름/지역 등)를 별도로 조회한다.
  const topBranchIds = (topBranchRanking.data ?? []).map((r) => r.branch_id);
  const topPlannerIds = (topPlannerRanking.data ?? []).map((r) => r.planner_profile_id);

  const recentPlannerRegionIds = Array.from(new Set((recentPlannersRaw.data ?? []).map((p) => p.active_region_id)));

  const [topBranchDetails, topPlannerDetails, recentPlannerRegions] = await Promise.all([
    topBranchIds.length > 0
      ? supabase.from('ga_branch').select('id, slug, name').in('id', topBranchIds)
      : Promise.resolve({ data: [] as { id: string; slug: string; name: string }[] }),
    topPlannerIds.length > 0
      ? supabase.from('planner_profiles').select('id, name, active_region_id').in('id', topPlannerIds)
      : Promise.resolve({ data: [] as { id: string; name: string; active_region_id: string }[] }),
    recentPlannerRegionIds.length > 0
      ? supabase.from('regions').select('id, sido_name, sigungu_name').in('id', recentPlannerRegionIds)
      : Promise.resolve({ data: [] as { id: string; sido_name: string; sigungu_name: string | null }[] }),
  ]);

  const topPlannerRegionIds = Array.from(new Set((topPlannerDetails.data ?? []).map((p) => p.active_region_id)));
  const topPlannerRegions =
    topPlannerRegionIds.length > 0
      ? ((await supabase.from('regions').select('id, sido_name, sigungu_name').in('id', topPlannerRegionIds)).data ?? [])
      : [];

  const regionMap = new Map([...(recentPlannerRegions.data ?? []), ...topPlannerRegions].map((r) => [r.id, r]));
  const branchNameMap = new Map((topBranchDetails.data ?? []).map((b) => [b.id, b]));
  const plannerNameMap = new Map((topPlannerDetails.data ?? []).map((p) => [p.id, p]));

  const todayNewGa = core.today_new_ga_count;
  const todayNewBranch = core.today_new_branch_count;
  const todayNewPlanner = core.today_new_planner_count;
  const traffic = siteTraffic.data?.[0] ?? { view_count: 0, visitor_count: 0 };

  return {
    approvedBranchCount: core.approved_branch_count,
    registeredPlannerCount: core.registered_planner_count,
    todayNewApprovedCount: todayNewGa + todayNewBranch + todayNewPlanner,
    todayVisitorCount: traffic.visitor_count ?? 0,

    approvedGaCount: core.approved_ga_count,
    todayViewCount: traffic.view_count ?? 0,
    todayContactClickCount: clicksToday.count ?? 0,
    activeRecruitCount: activeRecruits.count ?? 0,
    last7DaysContactClickCount: clicksLast7Days.count ?? 0,

    todayNewBreakdown: { ga: todayNewGa, branch: todayNewBranch, planner: todayNewPlanner },

    plannerStats: {
      registered: registeredPlanner.count ?? 0,
      approved: approvedPlanner.count ?? 0,
      visible: visiblePlanner.count ?? 0,
      incomeVerified: incomeVerifiedPlanner.count ?? 0,
      todayNew: todayNewPlanner,
    },

    pendingApprovalCounts,

    pendingGaList: pendingGa.data ?? [],
    recentGaList: recentGa.data ?? [],

    recentBranches: (recentBranchesRaw.data ?? []).map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      gaCompanyName: gaNameMap.get(b.ga_company_id) ?? '알 수 없음',
      createdAt: b.created_at,
    })),
    recentPlanners: (recentPlannersRaw.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      careerYears: p.career_years,
      regionLabel: regionLabel(regionMap.get(p.active_region_id)),
      createdAt: p.created_at,
    })),

    topBranches: (topBranchRanking.data ?? []).flatMap((r) => {
      const b = branchNameMap.get(r.branch_id);
      return b ? [{ id: b.id, slug: b.slug, name: b.name, viewCount: r.view_count }] : [];
    }),
    topPlanners: (topPlannerRanking.data ?? []).flatMap((r) => {
      const p = plannerNameMap.get(r.planner_profile_id);
      return p
        ? [{ id: p.id, name: p.name, regionLabel: regionLabel(regionMap.get(p.active_region_id)), viewCount: r.view_count }]
        : [];
    }),
  };
}
