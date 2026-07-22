'use client';

import { useState } from 'react';
import type { GaCompanyRow, GaMediaRow, GaBranchRow } from '@/lib/admin/ga';
import { GaInfoTab, type GaInfoDraft } from '@/components/admin/GaInfoTab';
import { GaPromoTab, type GaPromoDraft } from '@/components/admin/GaPromoTab';
import { GaSnsTab, type GaSnsDraft } from '@/components/admin/GaSnsTab';
import { GaExposureTab } from '@/components/admin/GaExposureTab';
import { GaDetailView } from '@/components/ga/GaDetailView';
import type { GaPreviewData } from '@/components/ga/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor } from 'lucide-react';

/** mock 시드 이미지(`/mock-logos/...`)처럼 이미 절대경로/외부 URL인 값은 그대로 쓰고,
 * 실제 업로드된 storage 키(예: `ga-id/uuid.jpg`)만 imageBaseUrl과 합친다. */
function resolveMediaUrl(value: string, source: 'storage' | 'external', imageBaseUrl: string): string {
  if (source === 'external' || value.startsWith('/') || /^https?:\/\//.test(value)) return value;
  return `${imageBaseUrl}/${value}`;
}

export function GaEditWorkspace({
  ga,
  media,
  branches,
  logoUrl,
  imageBaseUrl,
}: {
  ga: GaCompanyRow;
  media: GaMediaRow[];
  branches: GaBranchRow[];
  logoUrl: string | null;
  imageBaseUrl: string;
}) {
  const [infoDraft, setInfoDraft] = useState<GaInfoDraft>({
    name: ga.name,
    ceoName: ga.ceo_name ?? '',
    phone: ga.phone ?? '',
    homepageUrl: ga.homepage_url ?? '',
    operationType: ga.operation_type,
    isHeadquarters: ga.is_headquarters,
    address: {
      address: ga.address ?? '',
      addressDetail: ga.address_detail ?? '',
      zonecode: ga.zonecode ?? '',
      lat: ga.lat,
      lng: ga.lng,
    },
  });
  const [promoDraft, setPromoDraft] = useState<GaPromoDraft>({
    description: ga.description ?? '',
    educationInfo: ga.education_info ?? '',
    welfareInfo: ga.welfare_info ?? '',
    strengthsInfo: ga.strengths_info ?? '',
    promoVideoUrl: ga.promo_video_url ?? '',
  });
  const [snsDraft, setSnsDraft] = useState<GaSnsDraft>({
    blogUrl: ga.sns_blog_url ?? '',
    instagramUrl: ga.sns_instagram_url ?? '',
    youtubeUrl: ga.sns_youtube_url ?? '',
    kakaoChannelUrl: ga.sns_kakao_channel_url ?? '',
    openChatUrl: ga.sns_open_chat_url ?? '',
  });

  const banner = media.find((m) => m.media_type === 'banner');
  const gallery = media.filter((m) => m.media_type === 'gallery');

  const previewData: GaPreviewData = {
    name: infoDraft.name,
    slug: ga.slug,
    ceoName: infoDraft.ceoName || null,
    description: promoDraft.description || null,
    logoUrl,
    banner: banner
      ? { id: banner.id, type: 'banner', source: banner.source, url: resolveMediaUrl(banner.value, banner.source, imageBaseUrl) }
      : null,
    gallery: gallery.map((m) => ({
      id: m.id,
      type: 'gallery',
      source: m.source,
      url: resolveMediaUrl(m.value, m.source, imageBaseUrl),
    })),
    address: infoDraft.address.address || null,
    addressDetail: infoDraft.address.addressDetail || null,
    lat: infoDraft.address.lat,
    lng: infoDraft.address.lng,
    phone: infoDraft.phone || null,
    homepageUrl: infoDraft.homepageUrl || null,
    educationInfo: promoDraft.educationInfo || null,
    welfareInfo: promoDraft.welfareInfo || null,
    strengthsInfo: promoDraft.strengthsInfo || null,
    promoVideoUrl: promoDraft.promoVideoUrl || null,
    snsBlogUrl: snsDraft.blogUrl || null,
    snsInstagramUrl: snsDraft.instagramUrl || null,
    snsYoutubeUrl: snsDraft.youtubeUrl || null,
    snsKakaoChannelUrl: snsDraft.kakaoChannelUrl || null,
    snsOpenChatUrl: snsDraft.openChatUrl || null,
    isHeadquarters: infoDraft.isHeadquarters,
    operationType: infoDraft.operationType,
    isRecruiting: ga.is_recruiting,
    isVerified: ga.is_verified,
    branchCount: branches.length,
    branches: branches.map((b) => ({ id: b.id, name: b.name, address: b.address, sidoName: null, sigunguName: null })),
    activeRecruits: [],
    updatedAt: ga.updated_at,
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="promo">홍보</TabsTrigger>
          <TabsTrigger value="sns">SNS</TabsTrigger>
          <TabsTrigger value="exposure">노출설정</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="max-w-2xl">
          <GaInfoTab ga={ga} onDraftChange={setInfoDraft} />
        </TabsContent>
        <TabsContent value="promo" className="max-w-2xl">
          <GaPromoTab ga={ga} media={media} imageBaseUrl={imageBaseUrl} onDraftChange={setPromoDraft} />
        </TabsContent>
        <TabsContent value="sns" className="max-w-xl">
          <GaSnsTab ga={ga} onDraftChange={setSnsDraft} />
        </TabsContent>
        <TabsContent value="exposure" className="max-w-xl">
          <GaExposureTab ga={ga} />
        </TabsContent>
      </Tabs>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          실시간 미리보기 (실제 공개 페이지와 동일한 컴포넌트)
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border bg-white p-4 shadow-sm">
          <GaDetailView data={previewData} variant="preview" />
        </div>
      </div>
    </div>
  );
}
