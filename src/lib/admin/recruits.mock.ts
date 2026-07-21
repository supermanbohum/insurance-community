import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { RecruitListItem } from './recruits.supabase';

export async function listAllRecruits(options: { status?: 'active' | 'closed'; q?: string }): Promise<RecruitListItem[]> {
  let list = [...mockStore.branchRecruits];
  if (options.status === 'active') list = list.filter((r) => r.is_active);
  if (options.status === 'closed') list = list.filter((r) => !r.is_active);
  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((r) => r.title.toLowerCase().includes(q));
  }
  list = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return list.map((r) => {
    const branch = mockStore.branches.find((b) => b.id === r.branch_id);
    const company = branch ? mockStore.gaCompanies.find((g) => g.id === branch.ga_company_id) : undefined;
    return {
      id: r.id,
      branchId: r.branch_id,
      branchName: branch?.name ?? '알 수 없음',
      gaCompanyName: company?.name ?? '-',
      title: r.title,
      employmentType: r.employment_type,
      isActive: r.is_active,
      endAt: r.end_at,
      createdAt: r.created_at,
    };
  });
}
