import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { PublicBranchSummary } from '@/types/database';
import type { BranchDetail, BranchSortOption } from './branch.supabase';

function isPubliclyVisible(branch: { status: string; ga_company_id: string }): boolean {
  if (branch.status !== 'visible') return false;
  const company = mockStore.gaCompanies.find((c) => c.id === branch.ga_company_id);
  return company?.approval_status === 'approved';
}

function toSummary(branch: (typeof mockStore.branches)[number]): PublicBranchSummary {
  const company = mockStore.gaCompanies.find((c) => c.id === branch.ga_company_id);
  const region = mockStore.regions.find((r) => r.id === branch.region_id) ?? null;
  const mainImage = mockStore.branchMedia.find((m) => m.branch_id === branch.id && m.media_type === 'image_main');
  return {
    id: branch.id,
    gaCompanyId: company?.id ?? '',
    gaCompanyName: company?.name ?? '',
    gaCompanySlug: company?.slug ?? '',
    isGaVerified: company?.is_verified ?? false,
    name: branch.name,
    sidoName: region?.sido_name ?? null,
    sigunguName: region?.sigungu_name ?? null,
    address: branch.address,
    mainImageUrl: mainImage ? mainImage.value : null,
    viewCount: branch.organic_view_count + branch.imported_view_count + branch.correction_view_count,
    isRecommended: branch.is_recommended,
    createdAt: branch.created_at,
    updatedAt: branch.updated_at,
    gaBranchCount: mockStore.branches.filter((b) => b.ga_company_id === branch.ga_company_id && isPubliclyVisible(b)).length,
    operationType: company?.operation_type ?? 'branch',
  };
}

export async function listPublicBranches(options: {
  regionId?: string;
  sidoCode?: string;
  q?: string;
  sort?: BranchSortOption;
  limit?: number;
  gaCompanyIds?: string[];
  minPlannerCount?: number;
  parkingAvailable?: boolean;
  operationType?: 'direct' | 'branch';
}): Promise<PublicBranchSummary[]> {
  let list = mockStore.branches.filter(isPubliclyVisible);

  if (options.operationType) {
    list = list.filter((b) => {
      const company = mockStore.gaCompanies.find((c) => c.id === b.ga_company_id);
      return company?.operation_type === options.operationType;
    });
  }

  if (options.regionId) {
    list = list.filter((b) => b.region_id === options.regionId);
  } else if (options.sidoCode) {
    const regionIds = mockStore.regions.filter((r) => r.sido_code === options.sidoCode).map((r) => r.id);
    list = list.filter((b) => b.region_id && regionIds.includes(b.region_id));
  }

  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((b) => b.name.toLowerCase().includes(q));
  }

  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    list = list.filter((b) => options.gaCompanyIds!.includes(b.ga_company_id));
  }

  if (options.minPlannerCount) {
    list = list.filter((b) => (b.planner_count ?? 0) >= options.minPlannerCount!);
  }

  if (options.parkingAvailable !== undefined) {
    list = list.filter((b) => b.parking_available === options.parkingAvailable);
  }

  if (options.sort === 'newest') {
    list = [...list].sort(
      (a, b) => b.display_priority - a.display_priority || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (options.sort === 'views') {
    list = [...list].sort((a, b) => b.display_priority - a.display_priority || b.organic_view_count - a.organic_view_count);
  } else {
    list = [...list].sort((a, b) => {
      if (a.display_priority !== b.display_priority) return b.display_priority - a.display_priority;
      if (a.is_recommended !== b.is_recommended) return a.is_recommended ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  if (options.limit) {
    list = list.slice(0, options.limit);
  }

  return list.map(toSummary);
}

export async function getPublicBranchDetail(branchId: string): Promise<BranchDetail | null> {
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch || !isPubliclyVisible(branch)) return null;

  const company = mockStore.gaCompanies.find((c) => c.id === branch.ga_company_id);
  const region = mockStore.regions.find((r) => r.id === branch.region_id) ?? null;
  const gaBranchCount = mockStore.branches.filter(
    (b) => b.ga_company_id === branch.ga_company_id && isPubliclyVisible(b)
  ).length;

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    addressDetail: branch.address_detail,
    sidoName: region?.sido_name ?? null,
    sigunguName: region?.sigungu_name ?? null,
    gaBranchCount,
    lat: branch.lat,
    lng: branch.lng,
    introText: branch.intro_text,
    educationInfo: branch.education_info,
    welfareInfo: branch.welfare_info,
    dbSupportInfo: branch.db_support_info,
    settlementSupportInfo: branch.settlement_support_info,
    plannerCount: branch.planner_count,
    parkingAvailable: branch.parking_available,
    visitConsultAvailable: branch.visit_consult_available,
    businessHours: branch.business_hours,
    updatedAt: branch.updated_at,
    viewCount: branch.organic_view_count + branch.imported_view_count + branch.correction_view_count,
    isRecommended: branch.is_recommended,
    gaCompany: {
      id: company?.id ?? '',
      name: company?.name ?? '',
      slug: company?.slug ?? '',
      isVerified: company?.is_verified ?? false,
      ceoName: company?.ceo_name ?? null,
      description: company?.description ?? null,
      operationType: company?.operation_type ?? 'branch',
    },
    media: mockStore.branchMedia
      .filter((m) => m.branch_id === branchId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, type: m.media_type, source: m.source, url: m.value })),
    contacts: mockStore.branchContacts
      .filter((c) => c.branch_id === branchId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ id: c.id, type: c.type, value: c.value, label: c.label })),
    insurerNames: mockStore.branchInsurers
      .filter((bi) => bi.branch_id === branchId)
      .map((bi) => mockStore.insurers.find((i) => i.id === bi.insurer_id)?.name)
      .filter((name): name is string => Boolean(name)),
    activeRecruits: mockStore.branchRecruits
      .filter((r) => r.branch_id === branchId && r.is_active)
      .map((r) => ({ id: r.id, title: r.title, content: r.content, employmentType: r.employment_type })),
  };
}

export async function recordBranchView(branchId: string): Promise<void> {
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch) return;
  branch.organic_view_count += 1;
  mockStore.branchViews.push({ id: mockStore.genId('view'), branch_id: branchId, created_at: mockStore.nowIso() });
}

export async function recordBranchContactClick(contactId: string): Promise<void> {
  const contact = mockStore.branchContacts.find((c) => c.id === contactId);
  if (!contact) return;
  mockStore.contactClicks.push({
    id: mockStore.genId('click'),
    branch_id: contact.branch_id,
    contact_id: contact.id,
    contact_type: contact.type,
    created_at: mockStore.nowIso(),
  });
}
