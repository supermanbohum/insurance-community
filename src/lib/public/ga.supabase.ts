import { createServerSupabaseClient } from '@/lib/supabase/server';

export type GaOperationType = 'direct' | 'branch';

export interface PublicGaListItem {
  id: string;
  slug: string;
  name: string;
  ceoName: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  branchCount: number;
  operationType: GaOperationType;
}

export async function listPublicGaCompanies(options: {
  q?: string;
  gaCompanyIds?: string[];
  operationType?: GaOperationType;
}): Promise<PublicGaListItem[]> {
  const supabase = createServerSupabaseClient();
  const logoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;

  let query = supabase
    .from('ga_company')
    .select('id, slug, name, ceo_name, is_verified, logo_path, operation_type, ga_branch(id)')
    .order('name', { ascending: true });

  if (options.q) {
    query = query.ilike('name', `%${options.q}%`);
  }

  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    query = query.in('id', options.gaCompanyIds);
  }

  if (options.operationType) {
    query = query.eq('operation_type', options.operationType);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    ceoName: row.ceo_name,
    isVerified: row.is_verified,
    logoUrl: row.logo_path ? `${logoBaseUrl}/${row.logo_path}` : null,
    branchCount: Array.isArray(row.ga_branch) ? row.ga_branch.length : 0,
    operationType: row.operation_type as GaOperationType,
  }));
}

export interface PublicGaMediaItem {
  id: string;
  type: 'banner' | 'gallery';
  source: 'storage' | 'external';
  url: string;
}

export interface PublicGaRecruitItem {
  id: string;
  branchId: string;
  branchName: string;
  title: string;
  content: string;
  employmentType: string | null;
}

export interface PublicGaDetail {
  id: string;
  slug: string;
  name: string;
  ceoName: string | null;
  description: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  banner: PublicGaMediaItem | null;
  gallery: PublicGaMediaItem[];
  updatedAt: string;
  operationType: GaOperationType;
  isHeadquarters: boolean;
  isRecruiting: boolean;
  address: string | null;
  addressDetail: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  homepageUrl: string | null;
  educationInfo: string | null;
  welfareInfo: string | null;
  strengthsInfo: string | null;
  promoVideoUrl: string | null;
  snsBlogUrl: string | null;
  snsInstagramUrl: string | null;
  snsYoutubeUrl: string | null;
  snsKakaoChannelUrl: string | null;
  snsOpenChatUrl: string | null;
  branches: { id: string; name: string; address: string; sidoName: string | null; sigunguName: string | null }[];
  activeRecruits: PublicGaRecruitItem[];
}

export async function getPublicGaDetailBySlug(slug: string): Promise<PublicGaDetail | null> {
  const supabase = createServerSupabaseClient();
  const logoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;
  const bannerBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-banners`;
  const galleryBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-gallery`;

  const { data: company, error } = await supabase
    .from('ga_company')
    .select(
      'id, slug, name, ceo_name, description, is_verified, logo_path, updated_at, operation_type, is_headquarters, is_recruiting, status, address, address_detail, lat, lng, phone, homepage_url, education_info, welfare_info, strengths_info, promo_video_url, sns_blog_url, sns_instagram_url, sns_youtube_url, sns_kakao_channel_url, sns_open_chat_url'
    )
    .eq('slug', slug)
    .eq('status', 'visible')
    .single();

  if (error || !company) return null;

  const [{ data: branches, error: branchesError }, { data: media, error: mediaError }] = await Promise.all([
    supabase
      .from('ga_branch')
      .select('id, name, address, region:region_id(sido_name, sigungu_name), branch_recruit(id, title, content, employment_type, is_active)')
      .eq('ga_company_id', company.id)
      .eq('status', 'visible')
      .order('name', { ascending: true }),
    supabase.from('ga_media').select('id, media_type, source, value').eq('ga_company_id', company.id).order('sort_order', { ascending: true }),
  ]);
  if (branchesError) throw branchesError;
  if (mediaError) throw mediaError;

  const mediaItems = media ?? [];
  const banner = mediaItems.find((m) => m.media_type === 'banner');
  const gallery = mediaItems.filter((m) => m.media_type === 'gallery');

  const branchRows = (branches ?? []) as unknown as {
    id: string;
    name: string;
    address: string;
    region: { sido_name: string; sigungu_name: string | null } | null;
    branch_recruit: { id: string; title: string; content: string; employment_type: string | null; is_active: boolean }[] | null;
  }[];

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    ceoName: company.ceo_name,
    description: company.description,
    isVerified: company.is_verified,
    logoUrl: company.logo_path ? `${logoBaseUrl}/${company.logo_path}` : null,
    banner: banner ? { id: banner.id, type: 'banner', source: banner.source, url: `${bannerBaseUrl}/${banner.value}` } : null,
    gallery: gallery.map((m) => ({ id: m.id, type: 'gallery', source: m.source, url: `${galleryBaseUrl}/${m.value}` })),
    updatedAt: company.updated_at,
    operationType: company.operation_type as GaOperationType,
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
    branches: branchRows.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      sidoName: b.region?.sido_name ?? null,
      sigunguName: b.region?.sigungu_name ?? null,
    })),
    activeRecruits: branchRows.flatMap((b) =>
      (b.branch_recruit ?? [])
        .filter((r) => r.is_active)
        .map((r) => ({ id: r.id, branchId: b.id, branchName: b.name, title: r.title, content: r.content, employmentType: r.employment_type }))
    ),
  };
}
