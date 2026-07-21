import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RecruitListItem {
  id: string;
  branchId: string;
  branchName: string;
  gaCompanyName: string;
  title: string;
  employmentType: string | null;
  isActive: boolean;
  endAt: string | null;
  createdAt: string;
}

export async function listAllRecruits(options: { status?: 'active' | 'closed'; q?: string }): Promise<RecruitListItem[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('branch_recruit')
    .select(
      'id, branch_id, title, employment_type, is_active, end_at, created_at, ga_branch:branch_id(name, ga_company:ga_company_id(name))'
    )
    .order('created_at', { ascending: false });

  if (options.status === 'active') query = query.eq('is_active', true);
  if (options.status === 'closed') query = query.eq('is_active', false);
  if (options.q) query = query.ilike('title', `%${options.q}%`);

  const { data } = await query;

  return (data ?? []).map((row) => {
    const branch = row.ga_branch as unknown as { name: string; ga_company: { name: string } | null } | null;
    return {
      id: row.id,
      branchId: row.branch_id,
      branchName: branch?.name ?? '알 수 없음',
      gaCompanyName: branch?.ga_company?.name ?? '-',
      title: row.title,
      employmentType: row.employment_type,
      isActive: row.is_active,
      endAt: row.end_at,
      createdAt: row.created_at,
    };
  });
}
