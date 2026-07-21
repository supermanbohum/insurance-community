import { notFound } from 'next/navigation';
import { getPublicBranchDetail, recordBranchView } from '@/lib/public/branch';
import { BranchDetailView } from '@/components/branch/BranchDetailView';
import type { BranchPreviewData } from '@/components/branch/types';

export const dynamic = 'force-dynamic';

export default async function BranchDetailPage({ params }: { params: { branchId: string } }) {
  const branch = await getPublicBranchDetail(params.branchId);
  if (!branch) {
    notFound();
  }

  // 조회수 집계 (record_post_view와 동일한 중복 방지 패턴, RLS 하에서 익명 세션 기준으로 카운트).
  await recordBranchView(branch.id);

  const data: BranchPreviewData = {
    name: branch.name,
    address: branch.address,
    addressDetail: branch.addressDetail,
    sidoName: branch.sidoName,
    sigunguName: branch.sigunguName,
    gaBranchCount: branch.gaBranchCount,
    lat: branch.lat,
    lng: branch.lng,
    introText: branch.introText,
    educationInfo: branch.educationInfo,
    welfareInfo: branch.welfareInfo,
    dbSupportInfo: branch.dbSupportInfo,
    settlementSupportInfo: branch.settlementSupportInfo,
    plannerCount: branch.plannerCount,
    parkingAvailable: branch.parkingAvailable,
    visitConsultAvailable: branch.visitConsultAvailable,
    businessHours: branch.businessHours,
    updatedAt: branch.updatedAt,
    gaCompanyName: branch.gaCompany.name,
    isGaVerified: branch.gaCompany.isVerified,
    media: branch.media.map((m) => ({ id: m.id, type: m.type as BranchPreviewData['media'][number]['type'], source: m.source as 'storage' | 'external', url: m.url })),
    contacts: branch.contacts,
    insurerNames: branch.insurerNames,
    activeRecruits: branch.activeRecruits,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <BranchDetailView data={data} variant="public" />
    </div>
  );
}
