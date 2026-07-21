import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { ContactClickListItem, InquirySummary } from './inquiries.supabase';

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function getInquirySummary(): Promise<InquirySummary> {
  const todayStart = startOfTodayIso();
  const sevenDaysAgo = daysAgoIso(7);
  const clicks = mockStore.contactClicks;

  const byTypeMap = new Map<string, number>();
  for (const c of clicks.filter((c) => c.created_at >= sevenDaysAgo)) {
    byTypeMap.set(c.contact_type, (byTypeMap.get(c.contact_type) ?? 0) + 1);
  }

  return {
    totalCount: clicks.length,
    todayCount: clicks.filter((c) => c.created_at >= todayStart).length,
    last7DaysCount: clicks.filter((c) => c.created_at >= sevenDaysAgo).length,
    byType: Array.from(byTypeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function listRecentContactClicks(options: { branchId?: string; limit?: number }): Promise<ContactClickListItem[]> {
  let list = [...mockStore.contactClicks];
  if (options.branchId) list = list.filter((c) => c.branch_id === options.branchId);
  list = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, options.limit ?? 50);

  return list.map((c) => {
    const branch = mockStore.branches.find((b) => b.id === c.branch_id);
    const company = branch ? mockStore.gaCompanies.find((g) => g.id === branch.ga_company_id) : undefined;
    return {
      id: c.id,
      branchId: c.branch_id,
      branchName: branch?.name ?? '알 수 없음',
      gaCompanyName: company?.name ?? '-',
      contactType: c.contact_type,
      createdAt: c.created_at,
    };
  });
}
