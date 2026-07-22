import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PublicBranchSummary } from '@/types/database';

const SUMMARY_SELECT = `
  id, name, address, organic_view_count, imported_view_count, correction_view_count,
  is_recommended, created_at,
  ga_company:ga_company_id ( id, name, slug, is_verified ),
  region:region_id ( sido_name, sigungu_name ),
  branch_media ( value, media_type, source )
`;

interface BranchSummaryRow {
  id: string;
  name: string;
  address: string;
  organic_view_count: number;
  imported_view_count: number;
  correction_view_count: number;
  is_recommended: boolean;
  created_at: string;
  ga_company: { id: string; name: string; slug: string; is_verified: boolean } | null;
  region: { sido_name: string; sigungu_name: string | null } | null;
  branch_media: { value: string; media_type: string; source: string }[] | null;
}

function toSummary(row: BranchSummaryRow, imageBaseUrl: string): PublicBranchSummary {
  const mainImage = row.branch_media?.find((m) => m.media_type === 'image_main');
  return {
    id: row.id,
    gaCompanyId: row.ga_company?.id ?? '',
    gaCompanyName: row.ga_company?.name ?? '',
    gaCompanySlug: row.ga_company?.slug ?? '',
    isGaVerified: row.ga_company?.is_verified ?? false,
    name: row.name,
    sidoName: row.region?.sido_name ?? null,
    sigunguName: row.region?.sigungu_name ?? null,
    address: row.address,
    mainImageUrl: mainImage ? (mainImage.source === 'external' ? mainImage.value : `${imageBaseUrl}/${mainImage.value}`) : null,
    viewCount: row.organic_view_count + row.imported_view_count + row.correction_view_count,
    isRecommended: row.is_recommended,
    createdAt: row.created_at,
  };
}

function getImageBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;
}

export type BranchSortOption = 'recommended' | 'newest' | 'views';

export async function listPublicBranches(options: {
  regionId?: string;
  sidoCode?: string;
  q?: string;
  sort?: BranchSortOption;
  limit?: number;
  gaCompanyIds?: string[];
  minPlannerCount?: number;
  parkingAvailable?: boolean;
}): Promise<PublicBranchSummary[]> {
  const supabase = createServerSupabaseClient();
  const imageBaseUrl = getImageBaseUrl();

  let query = supabase.from('ga_branch').select(SUMMARY_SELECT);

  if (options.regionId) {
    query = query.eq('region_id', options.regionId);
  } else if (options.sidoCode) {
    const { data: regionIds, error: regionError } = await supabase
      .from('regions')
      .select('id')
      .eq('sido_code', options.sidoCode);
    if (regionError) throw regionError;
    query = query.in('region_id', (regionIds ?? []).map((r) => r.id));
  }

  if (options.q) {
    query = query.ilike('name', `%${options.q}%`);
  }

  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    query = query.in('ga_company_id', options.gaCompanyIds);
  }

  if (options.minPlannerCount) {
    query = query.gte('planner_count', options.minPlannerCount);
  }

  if (options.parkingAvailable !== undefined) {
    query = query.eq('parking_available', options.parkingAvailable);
  }

  if (options.sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (options.sort === 'views') {
    query = query.order('organic_view_count', { ascending: false });
  } else {
    query = query.order('is_recommended', { ascending: false }).order('created_at', { ascending: false });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as BranchSummaryRow[]).map((row) => toSummary(row, imageBaseUrl));
}

export interface BranchDetail {
  id: string;
  name: string;
  address: string;
  addressDetail: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  gaBranchCount: number;
  lat: number | null;
  lng: number | null;
  introText: string | null;
  educationInfo: string | null;
  welfareInfo: string | null;
  dbSupportInfo: string | null;
  settlementSupportInfo: string | null;
  plannerCount: number | null;
  parkingAvailable: boolean | null;
  visitConsultAvailable: boolean | null;
  businessHours: string | null;
  updatedAt: string;
  viewCount: number;
  isRecommended: boolean;
  gaCompany: { id: string; name: string; slug: string; isVerified: boolean; ceoName: string | null; description: string | null };
  media: { id: string; type: string; source: string; url: string }[];
  contacts: { id: string; type: string; value: string; label: string | null }[];
  insurerNames: string[];
  activeRecruits: { id: string; title: string; content: string; employmentType: string | null }[];
}

export async function getPublicBranchDetail(branchId: string): Promise<BranchDetail | null> {
  const supabase = createServerSupabaseClient();
  const imageBaseUrl = getImageBaseUrl();
  const videoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-videos`;

  const { data: branch, error } = await supabase
    .from('ga_branch')
    .select(
      `id, name, address, address_detail, lat, lng, intro_text, education_info, welfare_info,
       db_support_info, settlement_support_info, planner_count, parking_available, visit_consult_available,
       business_hours, updated_at, organic_view_count, imported_view_count,
       correction_view_count, is_recommended,
       ga_company:ga_company_id ( id, name, slug, is_verified, ceo_name, description ),
       region:region_id ( sido_name, sigungu_name )`
    )
    .eq('id', branchId)
    .single();

  if (error || !branch) return null;

  const gaCompany = branch.ga_company as unknown as {
    id: string;
    name: string;
    slug: string;
    is_verified: boolean;
    ceo_name: string | null;
    description: string | null;
  } | null;
  const region = branch.region as unknown as { sido_name: string; sigungu_name: string | null } | null;

  const [mediaRes, contactsRes, insurerLinksRes, recruitsRes, branchCountRes] = await Promise.all([
    supabase.from('branch_media').select('id, media_type, source, value, sort_order').eq('branch_id', branchId).order('sort_order'),
    supabase.from('branch_contacts').select('id, type, value, label, sort_order').eq('branch_id', branchId).order('sort_order'),
    supabase.from('branch_insurers').select('insurer_id, insurers:insurer_id(name)').eq('branch_id', branchId),
    supabase
      .from('branch_recruit')
      .select('id, title, content, employment_type')
      .eq('branch_id', branchId)
      .eq('is_active', true),
    supabase
      .from('ga_branch')
      .select('id', { count: 'exact', head: true })
      .eq('ga_company_id', gaCompany?.id ?? '')
      .eq('status', 'visible'),
  ]);
  const subError = mediaRes.error || contactsRes.error || insurerLinksRes.error || recruitsRes.error || branchCountRes.error;
  if (subError) throw subError;
  const { data: media } = mediaRes;
  const { data: contacts } = contactsRes;
  const { data: insurerLinks } = insurerLinksRes;
  const { data: recruits } = recruitsRes;

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    addressDetail: branch.address_detail,
    sidoName: region?.sido_name ?? null,
    sigunguName: region?.sigungu_name ?? null,
    gaBranchCount: branchCountRes.count ?? 0,
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
      id: gaCompany?.id ?? '',
      name: gaCompany?.name ?? '',
      slug: gaCompany?.slug ?? '',
      isVerified: gaCompany?.is_verified ?? false,
      ceoName: gaCompany?.ceo_name ?? null,
      description: gaCompany?.description ?? null,
    },
    media: (media ?? []).map((m) => ({
      id: m.id,
      type: m.media_type,
      source: m.source,
      url: m.source === 'external' ? m.value : `${m.media_type === 'video' ? videoBaseUrl : imageBaseUrl}/${m.value}`,
    })),
    contacts: (contacts ?? []).map((c) => ({ id: c.id, type: c.type, value: c.value, label: c.label })),
    insurerNames: (insurerLinks ?? [])
      .map((link) => (link.insurers as unknown as { name: string } | null)?.name)
      .filter((name): name is string => Boolean(name)),
    activeRecruits: (recruits ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      employmentType: r.employment_type,
    })),
  };
}

/** 지점 상세 진입 시 조회수 집계 (record_post_view와 동일한 중복 방지 패턴). */
export async function recordBranchView(branchId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_branch_view', { p_branch_id: branchId });
}

/** 전화/카카오/홈페이지 등 연락 채널 클릭 시 문의 클릭수 집계. */
export async function recordBranchContactClick(contactId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_branch_contact_click', { p_contact_id: contactId });
}
