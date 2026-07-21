import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ContactClickListItem {
  id: string;
  branchId: string;
  branchName: string;
  gaCompanyName: string;
  contactType: string;
  createdAt: string;
}

export interface InquirySummary {
  totalCount: number;
  todayCount: number;
  last7DaysCount: number;
  byType: { type: string; count: number }[];
}

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
  const supabase = createAdminClient();
  const todayStart = startOfTodayIso();
  const sevenDaysAgo = daysAgoIso(7);

  const [total, today, last7Days, allForBreakdown] = await Promise.all([
    supabase.from('branch_contact_clicks').select('id', { count: 'exact', head: true }),
    supabase.from('branch_contact_clicks').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('branch_contact_clicks').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('branch_contact_clicks').select('contact_type').gte('created_at', sevenDaysAgo),
  ]);

  const byTypeMap = new Map<string, number>();
  for (const row of allForBreakdown.data ?? []) {
    byTypeMap.set(row.contact_type, (byTypeMap.get(row.contact_type) ?? 0) + 1);
  }
  const byType = Array.from(byTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCount: total.count ?? 0,
    todayCount: today.count ?? 0,
    last7DaysCount: last7Days.count ?? 0,
    byType,
  };
}

export async function listRecentContactClicks(options: {
  branchId?: string;
  limit?: number;
}): Promise<ContactClickListItem[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('branch_contact_clicks')
    .select('id, branch_id, contact_type, created_at, ga_branch:branch_id(name, ga_company:ga_company_id(name))')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 50);

  if (options.branchId) {
    query = query.eq('branch_id', options.branchId);
  }

  const { data } = await query;

  return (data ?? []).map((row) => {
    const branch = row.ga_branch as unknown as { name: string; ga_company: { name: string } | null } | null;
    return {
      id: row.id,
      branchId: row.branch_id,
      branchName: branch?.name ?? '알 수 없음',
      gaCompanyName: branch?.ga_company?.name ?? '-',
      contactType: row.contact_type,
      createdAt: row.created_at,
    };
  });
}
