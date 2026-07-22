import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { PublicGaListItem, PublicGaDetail, GaOperationType } from './ga.supabase';

export async function listPublicGaCompanies(options: {
  q?: string;
  gaCompanyIds?: string[];
  operationType?: GaOperationType;
}): Promise<PublicGaListItem[]> {
  let list = mockStore.gaCompanies.filter((c) => c.approval_status === 'approved');
  if (options.q) {
    const q = options.q.toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(q));
  }
  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    list = list.filter((c) => options.gaCompanyIds!.includes(c.id));
  }
  if (options.operationType) {
    list = list.filter((c) => c.operation_type === options.operationType);
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
    operationType: c.operation_type,
  }));
}

export async function getPublicGaDetailBySlug(slug: string): Promise<PublicGaDetail | null> {
  const company = mockStore.gaCompanies.find(
    (c) => c.slug === slug && c.approval_status === 'approved' && c.status === 'visible'
  );
  if (!company) return null;

  const visibleBranches = mockStore.branches
    .filter((b) => b.ga_company_id === company.id && b.status === 'visible')
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const branches = visibleBranches.map((b) => {
    const region = mockStore.regions.find((r) => r.id === b.region_id) ?? null;
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      sidoName: region?.sido_name ?? null,
      sigunguName: region?.sigungu_name ?? null,
    };
  });

  const activeRecruits = visibleBranches.flatMap((b) =>
    mockStore.branchRecruits
      .filter((r) => r.branch_id === b.id && r.is_active)
      .map((r) => ({
        id: r.id,
        branchId: b.id,
        branchName: b.name,
        title: r.title,
        content: r.content,
        employmentType: r.employment_type,
      }))
  );

  const media = mockStore.gaMedia.filter((m) => m.ga_company_id === company.id).sort((a, b) => a.sort_order - b.sort_order);
  const banner = media.find((m) => m.media_type === 'banner');
  const gallery = media.filter((m) => m.media_type === 'gallery');

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    ceoName: company.ceo_name,
    description: company.description,
    isVerified: company.is_verified,
    logoUrl: company.logo_path,
    banner: banner ? { id: banner.id, type: 'banner', source: banner.source, url: banner.value } : null,
    gallery: gallery.map((m) => ({ id: m.id, type: 'gallery', source: m.source, url: m.value })),
    updatedAt: company.updated_at,
    operationType: company.operation_type,
    isHeadquarters: company.is_headquarters,
    isRecruiting: company.is_recruiting,
    address: company.address,
    addressDetail: company.address_detail,
    lat: company.lat,
    lng: company.lng,
    phone: company.phone,
    homepageUrl: company.homepage_url,
    educationInfo: company.education_info,
    welfareInfo: company.welfare_info,
    strengthsInfo: company.strengths_info,
    promoVideoUrl: company.promo_video_url,
    snsBlogUrl: company.sns_blog_url,
    snsInstagramUrl: company.sns_instagram_url,
    snsYoutubeUrl: company.sns_youtube_url,
    snsKakaoChannelUrl: company.sns_kakao_channel_url,
    snsOpenChatUrl: company.sns_open_chat_url,
    branches,
    activeRecruits,
  };
}
