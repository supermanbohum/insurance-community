import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicBranchDetail, recordBranchView, listPublicBranches } from '@/lib/public/branch';
import { getCurrentUser } from '@/lib/auth/session';
import { isBranchFavorited } from '@/lib/user/favorites';
import { getPageLayoutConfig } from '@/lib/design/layout';
import { BranchDetailView } from '@/components/branch/BranchDetailView';
import { Breadcrumb } from '@/components/seo/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { localBusinessJsonLd } from '@/lib/seo/jsonld';
import { SITE_URL } from '@/lib/seo/config';
import type { BranchPreviewData } from '@/components/branch/types';
import type { BranchDetail } from '@/lib/public/branch';

export const dynamic = 'force-dynamic';

/** generateMetadata(og:title/description)와 카카오 공유 버튼이 같은 문구를 쓰도록 한 곳에 모았다. */
function buildBranchShareMeta(branch: BranchDetail) {
  const regionLabel = branch.sigunguName ?? branch.sidoName ?? '';
  const title = regionLabel ? `${branch.name} | ${regionLabel} 보험대리점` : branch.name;
  const description =
    branch.tagline ??
    `${branch.gaCompany.name} ${branch.name} - ${branch.address}. 채용정보와 상세 안내를 보험맵에서 확인하세요.`;
  return { title, description };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const branch = await getPublicBranchDetail(slug);
  if (!branch) return {};

  const { title, description } = buildBranchShareMeta(branch);

  // og:image는 여기서 지정하지 않는다 - 같은 디렉터리의 opengraph-image.tsx가 지점 대표
  // 사진을 브랜드 오버레이와 합성해 자동으로 만들어준다(둘 다 설정하면 이미지가 중복 노출됨).
  return {
    title,
    description,
    alternates: { canonical: `/branch/${branch.slug}` },
    openGraph: { title, description },
  };
}

export default async function BranchDetailPage({ params }: { params: { slug: string } }) {
  // Next.js 14 App Router: 페이지 컴포넌트의 동적 세그먼트 params는 Route Handler와 달리
  // percent-encoding이 자동으로 디코딩되지 않는 경우가 있어 명시적으로 디코딩한다.
  const slug = decodeURIComponent(params.slug);
  const branch = await getPublicBranchDetail(slug);
  if (!branch) {
    notFound();
  }

  // 조회수 집계 (record_post_view와 동일한 중복 방지 패턴, RLS 하에서 익명 세션 기준으로 카운트).
  await recordBranchView(branch.id);

  const [user, siblings, layoutConfig] = await Promise.all([
    getCurrentUser(),
    listPublicBranches({ gaCompanyIds: [branch.gaCompany.id] }),
    getPageLayoutConfig('branch_detail'),
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
    newRecruitTraining: branch.newRecruitTraining,
    experiencedHire: branch.experiencedHire,
    dbSupport: branch.dbSupport,
    settlementSupport: branch.settlementSupport,
    businessHours: branch.businessHours,
    tagline: branch.tagline,
    operationType: branch.operationType,
    isHeadquarters: branch.isHeadquarters,
    updatedAt: branch.updatedAt,
    gaCompanyName: branch.gaCompany.name,
    gaCompanyLogoUrl: branch.gaCompany.logoUrl,
    isGaVerified: branch.gaCompany.isVerified,
    media: branch.media.map((m) => ({ id: m.id, type: m.type as BranchPreviewData['media'][number]['type'], source: m.source as 'storage' | 'external', url: m.url })),
    contacts: branch.contacts,
    links: branch.links,
    insurerNames: branch.insurerNames,
    activeRecruits: branch.activeRecruits,
    siblingBranches: siblings
      .filter((s) => s.id !== branch.id)
      .map((s) => ({ id: s.id, slug: s.slug, name: s.name, sidoName: s.sidoName, sigunguName: s.sigunguName })),
    plannerBadges: branch.plannerBadges,
  };

  const mainPhoto = branch.media.find((m) => m.type === 'image_main')?.url ?? null;
  const phone = branch.contacts.find((c) => c.type === 'phone')?.value ?? null;
  const shareMeta = buildBranchShareMeta(branch);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 lg:pb-4">
      <JsonLd
        data={localBusinessJsonLd({
          name: branch.name,
          slug: branch.slug,
          address: branch.address,
          sidoName: branch.sidoName,
          sigunguName: branch.sigunguName,
          lat: branch.lat,
          lng: branch.lng,
          imageUrl: mainPhoto,
          tagline: branch.tagline,
          gaCompanyName: branch.gaCompany.name,
          gaCompanyLogoUrl: branch.gaCompany.logoUrl,
          phone,
        })}
      />
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          ...(branch.sidoCode ? [{ label: branch.sidoName ?? '지역', href: `/region/${branch.sidoCode}` }] : []),
          { label: branch.gaCompany.name },
          { label: branch.name },
        ]}
      />
      <BranchDetailView
        data={data}
        variant="public"
        favorite={{ branchId: branch.id, initialFavorited }}
        inquiry={{ branchId: branch.id, branchName: branch.name }}
        share={{
          title: shareMeta.title,
          description: shareMeta.description,
          imageUrl: `${SITE_URL}/branch/${branch.slug}/opengraph-image`,
          url: `${SITE_URL}/branch/${branch.slug}`,
        }}
        layoutConfig={layoutConfig}
      />
    </div>
  );
}
