import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { DashboardStats } from './dashboard.supabase';

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStart = startOfTodayIso();

  const activeBranches = mockStore.branches.filter((b) => b.status !== 'deleted');
  const newGaToday = mockStore.gaCompanies.filter((c) => c.created_at >= todayStart).length;
  const newBranchToday = activeBranches.filter((b) => b.created_at >= todayStart).length;
  const viewsToday = mockStore.branchViews.filter((v) => v.created_at >= todayStart).length;
  const clicksToday = mockStore.contactClicks.filter((c) => c.created_at >= todayStart).length;

  const pendingGaList = mockStore.gaCompanies
    .filter((c) => c.approval_status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 10);

  const recentGaList = [...mockStore.gaCompanies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return {
    totalGaCount: mockStore.gaCompanies.length,
    totalBranchCount: activeBranches.length,
    todayNewCount: newGaToday + newBranchToday,
    todayViewCount: viewsToday,
    todayContactClickCount: clicksToday,
    pendingGaList,
    recentGaList,
  };
}
