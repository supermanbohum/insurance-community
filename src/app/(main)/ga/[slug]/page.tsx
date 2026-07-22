import { notFound } from 'next/navigation';
import { getPublicGaDetailBySlug } from '@/lib/public/ga';
import { GaDetailView } from '@/components/ga/GaDetailView';
import type { GaPreviewData } from '@/components/ga/types';

export const dynamic = 'force-dynamic';

export default async function GaDetailPage({ params }: { params: { slug: string } }) {
  const ga = await getPublicGaDetailBySlug(params.slug);
  if (!ga) {
    notFound();
  }

  const data: GaPreviewData = {
    name: ga.name,
    slug: ga.slug,
    ceoName: ga.ceoName,
    description: ga.description,
    logoUrl: ga.logoUrl,
    banner: ga.banner,
    gallery: ga.gallery,
    address: ga.address,
    addressDetail: ga.addressDetail,
    lat: ga.lat,
    lng: ga.lng,
    phone: ga.phone,
    homepageUrl: ga.homepageUrl,
    educationInfo: ga.educationInfo,
    welfareInfo: ga.welfareInfo,
    strengthsInfo: ga.strengthsInfo,
    promoVideoUrl: ga.promoVideoUrl,
    snsBlogUrl: ga.snsBlogUrl,
    snsInstagramUrl: ga.snsInstagramUrl,
    snsYoutubeUrl: ga.snsYoutubeUrl,
    snsKakaoChannelUrl: ga.snsKakaoChannelUrl,
    snsOpenChatUrl: ga.snsOpenChatUrl,
    isHeadquarters: ga.isHeadquarters,
    operationType: ga.operationType,
    isRecruiting: ga.isRecruiting,
    isVerified: ga.isVerified,
    branchCount: ga.branches.length,
    branches: ga.branches,
    activeRecruits: ga.activeRecruits,
    updatedAt: ga.updatedAt,
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-4">
      <GaDetailView data={data} variant="public" />
    </div>
  );
}
