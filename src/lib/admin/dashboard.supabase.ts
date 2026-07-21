import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export interface DashboardStats {
  totalGaCount: number;
  totalBranchCount: number;
  todayNewCount: number;
  todayViewCount: number;
  todayContactClickCount: number;
  pendingGaList: Database['public']['Tables']['ga_company']['Row'][];
  recentGaList: Database['public']['Tables']['ga_company']['Row'][];
}

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * 대시보드 요약 통계. admin_users는 RLS로 이 값들에 접근할 수 없으므로
 * (특히 pending 상태 ga_company, 전체 branch_views/branch_contact_clicks 등)
 * service role client로 조회한다. 호출 전 requireAdmin()으로 세션을 검증해야 한다.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const todayStart = startOfTodayIso();

  const [
    totalGa,
    totalBranch,
    newGaToday,
    newBranchToday,
    viewsToday,
    clicksToday,
    pendingGa,
    recentGa,
  ] = await Promise.all([
    supabase.from('ga_company').select('id', { count: 'exact', head: true }),
    supabase.from('ga_branch').select('id', { count: 'exact', head: true }).neq('status', 'deleted'),
    supabase.from('ga_company').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('ga_branch').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('branch_views').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('branch_contact_clicks').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase
      .from('ga_company')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10),
    supabase.from('ga_company').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  return {
    totalGaCount: totalGa.count ?? 0,
    totalBranchCount: totalBranch.count ?? 0,
    todayNewCount: (newGaToday.count ?? 0) + (newBranchToday.count ?? 0),
    todayViewCount: viewsToday.count ?? 0,
    todayContactClickCount: clicksToday.count ?? 0,
    pendingGaList: pendingGa.data ?? [],
    recentGaList: recentGa.data ?? [],
  };
}
