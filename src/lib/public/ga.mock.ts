import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { PublicGaListItem, PublicGaDetail } from './ga.supabase';

export async function listPublicGaCompanies(options: { q?: string }): Promise<PublicGaListItem[]> {
  let list = mockStore.gaCompanies.filter((c) => c.approval_status === 'approved');
  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(q));
  }
  list = [...list].sort((a, b) => b.display_priority - a.display_priority || a.name.localeCompare(b.name, 'ko'));

  return list.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    ceoName: c.ceo_name,
    isVerified: c.is_verified,
    logoUrl: c.logo_path,
    branchCount: mockStore.branches.filter((b) => b.ga_company_id === c.id && b.status !== 'deleted').length,
  }));
}

export async function getPublicGaDetailBySlug(slug: string): Promise<PublicGaDetail | null> {
  const company = mockStore.gaCompanies.find((c) => c.slug === slug && c.approval_status === 'approved');
  if (!company) return null;

  const branches = mockStore.branches
    .filter((b) => b.ga_company_id === company.id && b.status === 'visible')
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map((b) => {
      const region = mockStore.regions.find((r) => r.id === b.region_id) ?? null;
      return {
        id: b.id,
        name: b.name,
        address: b.address,
        sidoName: region?.sido_name ?? null,
        sigunguName: region?.sigungu_name ?? null,
      };
    });

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    ceoName: company.ceo_name,
    description: company.description,
    isVerified: company.is_verified,
    logoUrl: company.logo_path,
    updatedAt: company.updated_at,
    branches,
  };
}
