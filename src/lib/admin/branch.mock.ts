import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { GaStatus } from '@/types/database';
import type {
  BranchRow,
  BranchMediaRow,
  BranchContactRow,
  BranchRecruitRow,
  RegionRow,
  InsurerRow,
  BranchListRow,
} from './branch.supabase';

export async function listBranches(options: { status?: GaStatus; gaCompanyId?: string; q?: string }): Promise<BranchListRow[]> {
  let list = mockStore.branches.filter((b) => b.status !== 'deleted');
  if (options.status) list = list.filter((b) => b.status === options.status);
  if (options.gaCompanyId) list = list.filter((b) => b.ga_company_id === options.gaCompanyId);
  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((b) => b.name.toLowerCase().includes(q));
  }

  return list
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((b) => {
      const company = mockStore.gaCompanies.find((c) => c.id === b.ga_company_id);
      const region = mockStore.regions.find((r) => r.id === b.region_id);
      return {
        ...b,
        ga_company: company ? { id: company.id, name: company.name, approval_status: company.approval_status } : null,
        region: region ? { sido_name: region.sido_name, sigungu_name: region.sigungu_name } : null,
      };
    });
}

export async function getBranchById(branchId: string): Promise<BranchRow | null> {
  return mockStore.branches.find((b) => b.id === branchId) ?? null;
}

export async function getBranchMedia(branchId: string): Promise<BranchMediaRow[]> {
  return mockStore.branchMedia.filter((m) => m.branch_id === branchId).sort((a, b) => a.sort_order - b.sort_order);
}

export async function getBranchContacts(branchId: string): Promise<BranchContactRow[]> {
  return mockStore.branchContacts.filter((c) => c.branch_id === branchId).sort((a, b) => a.sort_order - b.sort_order);
}

export async function getBranchRecruits(branchId: string): Promise<BranchRecruitRow[]> {
  return mockStore.branchRecruits
    .filter((r) => r.branch_id === branchId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getBranchInsurerIds(branchId: string): Promise<string[]> {
  return mockStore.branchInsurers.filter((bi) => bi.branch_id === branchId).map((bi) => bi.insurer_id);
}

export async function listRegions(): Promise<RegionRow[]> {
  return [...mockStore.regions].sort((a, b) => a.sort_order - b.sort_order);
}

export async function listInsurers(): Promise<InsurerRow[]> {
  return mockStore.insurers.filter((i) => i.is_active).sort((a, b) => a.sort_order - b.sort_order);
}

export async function listApprovedGaCompaniesForSelect(): Promise<{ id: string; name: string }[]> {
  return [...mockStore.gaCompanies].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((c) => ({ id: c.id, name: c.name }));
}
