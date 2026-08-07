import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import type { PublicBranchSummary, GaOperationType, PlannerIncomeTier } from '@/types/database';

const TIER_RANK: Record<PlannerIncomeTier, number> = { tier_1: 1, tier_2: 2, tier_3: 3 };

const SUMMARY_SELECT = `
  id, slug, name, address, lat, lng, organic_view_count, imported_view_count, correction_view_count,
  is_recommended, has_new_open_badge, created_at, updated_at, operation_type, is_headquarters,
  ga_company:ga_company_id ( id, name, logo_path, is_verified, ga_branch(id) ),
  region:region_id ( sido_name, sigungu_name ),
  branch_media ( value, media_type, source ),
  branch_recruit ( id, is_active ),
  branch_contacts ( type, value )
`;

interface BranchSummaryRow {
  id: string;
  slug: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  organic_view_count: number;
  imported_view_count: number;
  correction_view_count: number;
  is_recommended: boolean;
  has_new_open_badge: boolean;
  created_at: string;
  updated_at: string;
  operation_type: GaOperationType;
  is_headquarters: boolean;
  ga_company: {
    id: string;
    name: string;
    logo_path: string | null;
    is_verified: boolean;
    ga_branch: { id: string }[] | null;
  } | null;
  region: { sido_name: string; sigungu_name: string | null } | null;
  branch_media: { value: string; media_type: string; source: string }[] | null;
  branch_recruit: { id: string; is_active: boolean }[] | null;
  branch_contacts: { type: string; value: string }[] | null;
}

function toKakaoHref(contacts: { type: string; value: string }[] | null): string | null {
  const kakao = contacts?.find((c) => c.type === 'kakao' || c.type === 'kakao_open_chat');
  if (!kakao) return null;
  return /^https?:\/\//.test(kakao.value) ? kakao.value : `https://${kakao.value}`;
}

function toSummary(
  row: BranchSummaryRow,
  imageBaseUrl: string,
  logoBaseUrl: string,
  contactClickCount: number,
  tagline: string | null,
  plannerBadge: { total: number; topTier: PlannerIncomeTier | null } = { total: 0, topTier: null }
): PublicBranchSummary {
  const mainImage = row.branch_media?.find((m) => m.media_type === 'image_main');
  return {
    id: row.id,
    slug: row.slug,
    gaCompanyId: row.ga_company?.id ?? '',
    gaCompanyName: row.ga_company?.name ?? '',
    gaCompanyLogoUrl: row.ga_company?.logo_path ? `${logoBaseUrl}/${row.ga_company.logo_path}` : null,
    isGaVerified: row.ga_company?.is_verified ?? false,
    name: row.name,
    sidoName: row.region?.sido_name ?? null,
    sigunguName: row.region?.sigungu_name ?? null,
    address: row.address,
    mainImageUrl: mainImage ? (mainImage.source === 'external' ? mainImage.value : `${imageBaseUrl}/${mainImage.value}`) : null,
    viewCount: row.organic_view_count + row.imported_view_count + row.correction_view_count,
    isRecommended: row.is_recommended,
    hasNewOpenBadge: row.has_new_open_badge,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gaBranchCount: Array.isArray(row.ga_company?.ga_branch) ? row.ga_company!.ga_branch.length : 0,
    operationType: row.operation_type,
    isHeadquarters: row.is_headquarters,
    lat: row.lat,
    lng: row.lng,
    hasActiveRecruit: (row.branch_recruit ?? []).some((r) => r.is_active),
    kakaoContactHref: toKakaoHref(row.branch_contacts),
    contactClickCount,
    tagline,
    plannerBadgeTotal: plannerBadge.total,
    plannerTopTier: plannerBadge.topTier,
  };
}

/** 지점별 승인+미만료 고소득 설계사 인원수/최고 등급을 배치 조회한다 - best-effort
 * (실패해도 목록 조회 자체는 깨지지 않게 tagline/contact_click_count와 동일한 패턴). */
async function fetchPlannerBadgeTotals(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  branchIds: string[]
): Promise<Map<string, { total: number; topTier: PlannerIncomeTier | null }>> {
  const result = new Map<string, { total: number; topTier: PlannerIncomeTier | null }>();
  if (branchIds.length === 0) return result;
  try {
    const { data, error } = await supabase
      .from('planner_certifications')
      .select('branch_id, income_tier')
      .in('branch_id', branchIds)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString());
    if (error) throw error;
    for (const row of data ?? []) {
      const entry = result.get(row.branch_id) ?? { total: 0, topTier: null };
      entry.total += 1;
      if (!entry.topTier || TIER_RANK[row.income_tier as PlannerIncomeTier] > TIER_RANK[entry.topTier]) {
        entry.topTier = row.income_tier as PlannerIncomeTier;
      }
      result.set(row.branch_id, entry);
    }
  } catch {
    // 무시 - 배지 없이 나머지 지점 데이터는 정상 표시.
  }
  return result;
}

function getImageBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;
}

function getLogoBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;
}

export type BranchSortOption = 'recommended' | 'newest' | 'views';

export async function listPublicBranches(options: {
  regionId?: string;
  sidoCode?: string;
  q?: string;
  sort?: BranchSortOption;
  limit?: number;
  gaCompanyIds?: string[];
  branchIds?: string[];
  minPlannerCount?: number;
  parkingAvailable?: boolean;
  operationType?: 'direct' | 'branch';
  /** 지도 "현재 지도에서 검색" - 뷰포트(Bounds) 안의 지점만 서버에서 다시 조회할 때 사용. */
  bounds?: { south: number; west: number; north: number; east: number };
  /** "고소득 설계사 보기" 검색 필터 - true면 승인+미만료 인증이 하나 이상 있는 지점만. */
  hasHighIncomePlanners?: boolean;
  /** 세부 등급 체크박스(1억+/2억+/3억+) - hasHighIncomePlanners와 함께 사용. */
  plannerTiers?: PlannerIncomeTier[];
}): Promise<PublicBranchSummary[]> {
  // cookies()를 건드리지 않는 공개 클라이언트 - 홈/검색/지도가 ISR 캐시를 쓸 수 있으려면
  // 이 함수가 요청마다 강제로 dynamic 렌더링되게 만들면 안 된다.
  const supabase = createPublicSupabaseClient();
  const imageBaseUrl = getImageBaseUrl();
  const logoBaseUrl = getLogoBaseUrl();

  let query = supabase.from('ga_branch').select(SUMMARY_SELECT);

  if (options.operationType) {
    query = query.eq('operation_type', options.operationType);
  }

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
    const q = options.q.trim();
    // 지점명뿐 아니라 지역명("수원", "강남")/GA 회사명("메타리치")으로도 검색되게
    // 2단계로 확장한다 - PostgREST의 or()는 조인된 테이블 컬럼을 직접 참조하지 못해서
    // (sidoCode 필터가 이미 쓰는 것과 동일한 패턴) 먼저 매칭되는 region_id/ga_company_id를
    // 구한 뒤 최종 쿼리의 or()에 in() 조건으로 합친다.
    const [{ data: matchedRegions }, { data: matchedCompanies }] = await Promise.all([
      supabase.from('regions').select('id').or(`sido_name.ilike.%${q}%,sigungu_name.ilike.%${q}%`),
      supabase.from('ga_company').select('id').ilike('name', `%${q}%`).eq('approval_status', 'approved'),
    ]);
    const regionIds = (matchedRegions ?? []).map((r) => r.id);
    const companyIds = (matchedCompanies ?? []).map((c) => c.id);

    const orParts = [`name.ilike.%${q}%`, `address.ilike.%${q}%`];
    if (regionIds.length > 0) orParts.push(`region_id.in.(${regionIds.join(',')})`);
    if (companyIds.length > 0) orParts.push(`ga_company_id.in.(${companyIds.join(',')})`);
    query = query.or(orParts.join(','));
  }

  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    query = query.in('ga_company_id', options.gaCompanyIds);
  }

  if (options.branchIds && options.branchIds.length > 0) {
    query = query.in('id', options.branchIds);
  }

  if (options.minPlannerCount) {
    query = query.gte('planner_count', options.minPlannerCount);
  }

  if (options.hasHighIncomePlanners) {
    const { data: matchedBranches } = await supabase.rpc('list_branches_with_planner_certifications', {
      p_tiers: options.plannerTiers && options.plannerTiers.length > 0 ? options.plannerTiers : undefined,
    });
    query = query.in('id', (matchedBranches ?? []).map((r) => r.branch_id));
  }

  if (options.parkingAvailable !== undefined) {
    query = query.eq('parking_available', options.parkingAvailable);
  }

  if (options.bounds) {
    const { south, west, north, east } = options.bounds;
    query = query.gte('lat', south).lte('lat', north).gte('lng', west).lte('lng', east);
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
  const rows = (data ?? []) as unknown as BranchSummaryRow[];

  // 문의수/한줄소개는 각각 별도 마이그레이션(0015/0016)으로 추가되는 컬럼이라, 메인 조회에
  // 넣으면 그 마이그레이션을 실행하기 전 배포에서 목록 조회 자체가 전부 깨진다. 컬럼이
  // 아직 없어도 나머지 지점 데이터는 정상 동작해야 하므로 각각 best-effort로 분리 조회한다.
  const ids = rows.map((r) => r.id);
  const [clickCounts, taglines, plannerBadges] = await Promise.all([
    fetchOptionalColumn<number>(supabase, ids, 'contact_click_count'),
    fetchOptionalColumn<string>(supabase, ids, 'tagline'),
    fetchPlannerBadgeTotals(supabase, ids),
  ]);

  return rows.map((row) =>
    toSummary(
      row,
      imageBaseUrl,
      logoBaseUrl,
      clickCounts.get(row.id) ?? 0,
      taglines.get(row.id) ?? null,
      plannerBadges.get(row.id) ?? { total: 0, topTier: null }
    )
  );
}

export interface BranchSearchResultLite {
  id: string;
  name: string;
  gaCompanyName: string;
  sidoName: string | null;
  sigunguName: string | null;
}

/** TOP설계사 공개 신청 폼의 "본인 지점 검색" 자동완성 전용 - listPublicBranches와 동일한
 * 지점명/GA명/지역명 2단계 매칭을 재사용하되, 응답을 최소 컬럼으로 줄인다. 공개(anon)
 * 클라이언트를 쓰므로 RLS("public read visible ga_branch")가 자동으로 registration_status=
 * approved/status=visible 지점만 결과에 남긴다 - 승인대기/반려/비공개/삭제 지점은 노출되지 않는다. */
export async function searchApprovedBranchesLite(q: string): Promise<BranchSearchResultLite[]> {
  const query = q.trim();
  if (query.length === 0) return [];

  const supabase = createPublicSupabaseClient();

  const [{ data: matchedRegions }, { data: matchedCompanies }] = await Promise.all([
    supabase.from('regions').select('id').or(`sido_name.ilike.%${query}%,sigungu_name.ilike.%${query}%`),
    supabase.from('ga_company').select('id').ilike('name', `%${query}%`).eq('approval_status', 'approved'),
  ]);
  const regionIds = (matchedRegions ?? []).map((r) => r.id);
  const companyIds = (matchedCompanies ?? []).map((c) => c.id);

  const orParts = [`name.ilike.%${query}%`];
  if (regionIds.length > 0) orParts.push(`region_id.in.(${regionIds.join(',')})`);
  if (companyIds.length > 0) orParts.push(`ga_company_id.in.(${companyIds.join(',')})`);

  const { data, error } = await supabase
    .from('ga_branch')
    .select('id, name, ga_company:ga_company_id(name), region:region_id(sido_name, sigungu_name)')
    .or(orParts.join(','))
    .order('name', { ascending: true })
    .limit(20);
  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    ga_company: { name: string } | null;
    region: { sido_name: string; sigungu_name: string | null } | null;
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    gaCompanyName: row.ga_company?.name ?? '알 수 없는 GA',
    sidoName: row.region?.sido_name ?? null,
    sigunguName: row.region?.sigungu_name ?? null,
  }));
}

/** 아직 마이그레이션이 적용되지 않았을 수 있는 컬럼을 안전하게 조회한다 - 컬럼이 없어
 * 조회가 실패하면(마이그레이션 미적용) 조용히 빈 Map을 반환하고, 호출부는 기본값을 쓴다. */
async function fetchOptionalColumn<T>(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  ids: string[],
  column: string
): Promise<Map<string, T>> {
  const result = new Map<string, T>();
  if (ids.length === 0) return result;
  try {
    const { data, error } = await supabase.from('ga_branch').select(`id, ${column}`).in('id', ids);
    if (error) throw error;
    for (const row of (data ?? []) as unknown as Record<string, T>[]) {
      result.set(row.id as unknown as string, row[column]);
    }
  } catch {
    // 마이그레이션 미적용 등으로 실패 - 호출부가 기본값(0, null 등)으로 처리한다.
  }
  return result;
}

export interface BranchDetail {
  id: string;
  slug: string;
  name: string;
  managerName: string | null;
  address: string;
  addressDetail: string | null;
  sidoCode: string | null;
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
  atmosphereInfo: string | null;
  plannerCount: number | null;
  parkingAvailable: boolean | null;
  visitConsultAvailable: boolean | null;
  newRecruitTraining: boolean | null;
  experiencedHire: boolean | null;
  dbSupport: boolean | null;
  settlementSupport: boolean | null;
  businessHours: string | null;
  tagline: string | null;
  operationType: GaOperationType;
  isHeadquarters: boolean;
  updatedAt: string;
  viewCount: number;
  isRecommended: boolean;
  hasNewOpenBadge: boolean;
  gaCompany: {
    id: string;
    name: string;
    logoUrl: string | null;
    isVerified: boolean;
    ceoName: string | null;
    description: string | null;
  };
  media: { id: string; type: string; source: string; url: string }[];
  contacts: { id: string; type: string; value: string; label: string | null }[];
  links: { id: string; type: string; url: string }[];
  insurerNames: string[];
  activeRecruits: { id: string; title: string; content: string; employmentType: string | null }[];
  /** 승인+미만료 고소득 설계사 등급별 인원수. 실명/서류 등 민감정보는 절대 포함하지 않는다. */
  plannerBadges: { tier: PlannerIncomeTier; count: number }[];
}

// generateMetadata와 페이지 컴포넌트가 같은 요청 안에서 각각 호출하므로 react cache()로
// 요청 단위 메모이제이션한다(요청 간에는 공유되지 않음 - 오래된 데이터가 남지 않는다).
export const getPublicBranchDetail = cache(async function getPublicBranchDetail(slug: string): Promise<BranchDetail | null> {
  const supabase = createServerSupabaseClient();
  const imageBaseUrl = getImageBaseUrl();
  const logoBaseUrl = getLogoBaseUrl();
  const videoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-videos`;

  const { data: branch, error } = await supabase
    .from('ga_branch')
    .select(
      `id, slug, name, manager_name, address, address_detail, lat, lng, intro_text, education_info, welfare_info,
       db_support_info, settlement_support_info, atmosphere_info, planner_count, parking_available, visit_consult_available,
       business_hours, operation_type, is_headquarters, updated_at, organic_view_count, imported_view_count,
       correction_view_count, is_recommended, has_new_open_badge,
       ga_company:ga_company_id ( id, name, logo_path, is_verified, ceo_name, description ),
       region:region_id ( sido_code, sido_name, sigungu_name )`
    )
    .eq('slug', slug)
    .single();

  if (error || !branch) return null;

  const gaCompany = branch.ga_company as unknown as {
    id: string;
    name: string;
    logo_path: string | null;
    is_verified: boolean;
    ceo_name: string | null;
    description: string | null;
  } | null;
  const region = branch.region as unknown as { sido_code: string; sido_name: string; sigungu_name: string | null } | null;

  const [mediaRes, contactsRes, insurerLinksRes, recruitsRes, branchCountRes] = await Promise.all([
    supabase.from('branch_media').select('id, media_type, source, value, sort_order').eq('branch_id', branch.id).order('sort_order'),
    supabase.from('branch_contacts').select('id, type, value, label, sort_order').eq('branch_id', branch.id).order('sort_order'),
    supabase.from('branch_insurers').select('insurer_id, insurers:insurer_id(name)').eq('branch_id', branch.id),
    supabase
      .from('branch_recruit')
      .select('id, title, content, employment_type')
      .eq('branch_id', branch.id)
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

  // 한줄소개/편의시설 체크박스는 migration 0016으로 추가되는 컬럼 - 적용 전 배포에서도
  // 상세페이지 자체는 깨지지 않도록 별도 best-effort 조회로 분리한다.
  let extra: {
    tagline: string | null;
    new_recruit_training: boolean | null;
    experienced_hire: boolean | null;
    db_support: boolean | null;
    settlement_support: boolean | null;
  } | null = null;
  try {
    const { data, error: extraError } = await supabase
      .from('ga_branch')
      .select('tagline, new_recruit_training, experienced_hire, db_support, settlement_support')
      .eq('id', branch.id)
      .single();
    if (extraError) throw extraError;
    extra = data;
  } catch {
    // 마이그레이션 미적용 - 아래에서 전부 null로 처리.
  }

  // branch_links(SNS/외부링크)는 migration 0017로 추가되는 테이블 - 적용 전에는 빈 배열로 처리.
  let links: { id: string; type: string; url: string }[] = [];
  try {
    const { data, error: linksError } = await supabase
      .from('branch_links')
      .select('id, type, url')
      .eq('branch_id', branch.id)
      .order('sort_order');
    if (linksError) throw linksError;
    links = data ?? [];
  } catch {
    // 마이그레이션 미적용 - 빈 배열 유지.
  }

  let plannerBadges: { tier: PlannerIncomeTier; count: number }[] = [];
  try {
    const { data: badgeRows, error: badgeError } = await supabase.rpc('get_branch_planner_badge_summary', {
      p_branch_id: branch.id,
    });
    if (badgeError) throw badgeError;
    plannerBadges = (badgeRows ?? []).map((b) => ({ tier: b.tier as PlannerIncomeTier, count: b.planner_count }));
  } catch {
    // 실패해도 배지 없이 나머지 지점 상세는 정상 표시.
  }

  return {
    id: branch.id,
    slug: branch.slug,
    name: branch.name,
    managerName: branch.manager_name,
    address: branch.address,
    addressDetail: branch.address_detail,
    sidoCode: region?.sido_code ?? null,
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
    atmosphereInfo: branch.atmosphere_info,
    plannerCount: branch.planner_count,
    parkingAvailable: branch.parking_available,
    visitConsultAvailable: branch.visit_consult_available,
    newRecruitTraining: extra?.new_recruit_training ?? null,
    experiencedHire: extra?.experienced_hire ?? null,
    dbSupport: extra?.db_support ?? null,
    settlementSupport: extra?.settlement_support ?? null,
    businessHours: branch.business_hours,
    tagline: extra?.tagline ?? null,
    operationType: branch.operation_type,
    isHeadquarters: branch.is_headquarters,
    updatedAt: branch.updated_at,
    viewCount: branch.organic_view_count + branch.imported_view_count + branch.correction_view_count,
    isRecommended: branch.is_recommended,
    hasNewOpenBadge: branch.has_new_open_badge,
    gaCompany: {
      id: gaCompany?.id ?? '',
      name: gaCompany?.name ?? '',
      logoUrl: gaCompany?.logo_path ? `${logoBaseUrl}/${gaCompany.logo_path}` : null,
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
    links,
    insurerNames: (insurerLinks ?? [])
      .map((link) => (link.insurers as unknown as { name: string } | null)?.name)
      .filter((name): name is string => Boolean(name)),
    activeRecruits: (recruits ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      employmentType: r.employment_type,
    })),
    plannerBadges,
  };
});

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

export interface HomeStats {
  branchCount: number;
  plannerTotal: number;
  /** 승인된 GA 법인 수 - 큐레이션된 마스터 데이터라 지점/설계사 시드 정리 같은 이벤트와
   * 무관하게 유지된다. 홈 화면 통계 라벨(W-031)이 지점/설계사 수 대신 이 값을 우선
   * 노출하는 이유: 저 두 값은 시드 정리 직후처럼 실데이터가 적을 때 "1개/0명" 같은
   * 초라한 숫자로 첫인상을 해칠 수 있지만, GA 법인 수는 그런 변동에 흔들리지 않는다. */
  gaCount: number;
  todayCount: number;
  todayVisitorCount: number;
}

/**
 * 홈 화면 상단 통계 - 관리자 대시보드와 완전히 동일한 기준을 쓰기 위해 두 곳 모두
 * get_platform_core_stats()/get_today_site_traffic_stats() RPC 하나씩을 공유한다
 * (직접 SQL을 두 곳에 따로 작성하면 나중에 기준이 어긋나기 쉽다).
 * - branchCount = 승인된 지점 수(소속 GA도 승인 상태여야 함, 미승인 GA 지점은 제외)
 * - plannerTotal = 승인된 지점이 등록 시 선택한 예상 설계사 인원 합계 + 직접
 *   등록해 승인·공개된 설계사 수
 * - todayCount = 오늘 승인된 GA + 지점 + 설계사 합계(생성일이 아니라 승인일 기준)
 * - todayVisitorCount = 오늘 사이트를 방문한 고유 방문자 수
 */
export async function getHomeStats(): Promise<HomeStats> {
  // createPublicSupabaseClient()는 다른 ISR 페이지의 캐시를 위해 일부러 cookies()를
  // 안 건드리는데, 그 부작용으로 supabase-js의 내부 fetch가 Next.js 데이터 캐시에
  // 걸려 DB가 바뀌어도 재검증 전까지 오래된 값을 계속 반환했다(W-050 후속 - RPC는
  // 고쳤는데 화면이 계속 이전 캐시값을 보여준 원인). 이 통계만큼은 항상 최신이어야
  // 하므로 noStore()로 이 호출 범위만 캐시에서 명시적으로 뺀다.
  noStore();
  const supabase = createPublicSupabaseClient();

  const [coreRes, trafficRes] = await Promise.all([
    supabase.rpc('get_platform_core_stats'),
    supabase.rpc('get_today_site_traffic_stats'),
  ]);

  const core = coreRes.data?.[0];
  const traffic = trafficRes.data?.[0];

  return {
    branchCount: core?.approved_branch_count ?? 0,
    plannerTotal: core?.registered_planner_count ?? 0,
    gaCount: core?.approved_ga_count ?? 0,
    todayCount: (core?.today_new_ga_count ?? 0) + (core?.today_new_branch_count ?? 0) + (core?.today_new_planner_count ?? 0),
    todayVisitorCount: traffic?.visitor_count ?? 0,
  };
}

/**
 * 이달의 인기지점 TOP N - branch_views 원본 로그는 비공개라 집계만 반환하는
 * list_monthly_top_branches RPC(migration 0018)를 쓴다. 마이그레이션 미적용 배포와도
 * 호환되도록 실패하면 빈 배열로 처리(목록/조회수 없이도 페이지 자체는 떠야 한다).
 */
export async function listMonthlyTopBranches(limit = 30): Promise<PublicBranchSummary[]> {
  const supabase = createPublicSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('list_monthly_top_branches', { p_limit: limit });
    if (error) throw error;
    const ranked = (data ?? []) as unknown as { branch_id: string; view_count: number }[];
    if (ranked.length === 0) return [];

    const summaries = await listPublicBranches({ branchIds: ranked.map((r) => r.branch_id) });
    const byId = new Map(summaries.map((s) => [s.id, s]));
    return ranked.map((r) => byId.get(r.branch_id)).filter((s): s is PublicBranchSummary => Boolean(s));
  } catch {
    return [];
  }
}

/**
 * sitemap.xml 전용 - listPublicBranches의 무거운 조인(ga_company/region/media/recruit/
 * contacts) 없이 slug와 updated_at만 가볍게 조회한다. RLS로 공개 지점만 내려오는 건
 * listPublicBranches와 동일하다.
 */
export async function listBranchSlugsForSitemap(): Promise<{ slug: string; updatedAt: string }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('ga_branch').select('slug, updated_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({ slug: row.slug as string, updatedAt: row.updated_at as string }));
}
