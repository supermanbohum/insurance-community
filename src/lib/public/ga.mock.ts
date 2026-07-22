import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { PublicGaListItem } from './ga.supabase';

export async function listPublicGaCompanies(options: {
  q?: string;
  gaCompanyIds?: string[];
}): Promise<PublicGaListItem[]> {
  let list = mockStore.gaCompanies.filter((c) => c.approval_status === 'approved');
  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(q));
  }
  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    list = list.filter((c) => options.gaCompanyIds!.includes(c.id));
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

/**
 * 옛 /ga/[slug] 링크(공식 상세페이지 폐지 전)가 들어왔을 때 어디로 보낼지 계산한다.
 * 본사 지점이 있으면 그 지점으로, 지점이 정확히 1개면 그 지점으로, 그 외엔 검색으로 보낸다.
 */
export async function getGaRedirectTarget(
  slug: string
): Promise<{ found: boolean; branchSlug: string | null; gaName: string | null }> {
  const company = mockStore.gaCompanies.find((c) => c.slug === slug);
  if (!company) return { found: false, branchSlug: null, gaName: null };

  const branches = mockStore.branches.filter((b) => b.ga_company_id === company.id && b.status === 'visible');
  const headquarters = branches.find((b) => b.is_headquarters);
  if (headquarters) return { found: true, branchSlug: headquarters.slug, gaName: company.name };
  if (branches.length === 1) return { found: true, branchSlug: branches[0].slug, gaName: company.name };
  return { found: true, branchSlug: null, gaName: company.name };
}
