import { notFound } from 'next/navigation';
import { getPublicBranchDetail, recordBranchView, listPublicBranches } from '@/lib/public/branch';
import { getCurrentUser } from '@/lib/auth/session';
import { isBranchFavorited } from '@/lib/user/favorites';
import { BranchDetailView } from '@/components/branch/BranchDetailView';
import type { BranchPreviewData } from '@/components/branch/types';

export const dynamic = 'force-dynamic';

export default async function BranchDetailPage({ params }: { params: { slug: string } }) {
  const branch = await getPublicBranchDetail(params.slug);
  if (!branch) {
    notFound();
  }

  // 조회수 집계 (record_post_view와 동일한 중복 방지 패턴, RLS 하에서 익명 세션 기준으로 카운트).
  await recordBranchView(branch.id);

  const [user, siblings] = await Promise.all([
    getCurrentUser(),
    listPublicBranches({ gaCompanyIds: [branch.gaCompany.id] }),
  ]);
  const initialFavorited = user ? await isBranchFavorited(user.id, branch.id) : false;

  const data: BranchPreviewData = {
    name: branch.name,
    slug: branch.slug,
    managerName: branch.managerName,
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
    atmosphereInfo: branch.atmosphereInfo,
    plannerCount: branch.plannerCount,
    parkingAvailable: branch.parkingAvailable,
    visitConsultAvailable: branch.visitConsultAvailable,
    businessHours: branch.businessHours,
    operationType: branch.operationType,
    isHeadquarters: branch.isHeadquarters,
    updatedAt: branch.updatedAt,
    gaCompanyName: branch.gaCompany.name,
    gaCompanyLogoUrl: branch.gaCompany.logoUrl,
    isGaVerified: branch.gaCompany.isVerified,
    media: branch.media.map((m) => ({ id: m.id, type: m.type as BranchPreviewData['media'][number]['type'], source: m.source as 'storage' | 'external', url: m.url })),
    contacts: branch.contacts,
    insurerNames: branch.insurerNames,
    activeRecruits: branch.activeRecruits,
    siblingBranches: siblings
      .filter((s) => s.id !== branch.id)
      .map((s) => ({ id: s.id, slug: s.slug, name: s.name, sidoName: s.sidoName, sigunguName: s.sigunguName })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <BranchDetailView data={data} variant="public" favorite={{ branchId: branch.id, initialFavorited }} />
    </div>
  );
}
