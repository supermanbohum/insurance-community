import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { GaApprovalStatus } from '@/types/database';
import type { GaCompanyRow, GaBranchRow } from './ga.supabase';

export async function listGaCompanies(options: { status?: GaApprovalStatus; q?: string }): Promise<GaCompanyRow[]> {
  let list = [...mockStore.gaCompanies];
  if (options.status) list = list.filter((c) => c.approval_status === options.status);
  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getGaCompanyById(gaCompanyId: string): Promise<GaCompanyRow | null> {
  return mockStore.gaCompanies.find((c) => c.id === gaCompanyId) ?? null;
}

export async function getBranchesByGaCompanyId(gaCompanyId: string): Promise<GaBranchRow[]> {
  return mockStore.branches
    .filter((b) => b.ga_company_id === gaCompanyId && b.status !== 'deleted')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
