import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { listPublicBranches, getHomeStats, getPublicBranchDetail } from '@/lib/public/branch';
import { listGaQualityRanking } from '@/lib/public/top-designer.supabase';
import { getPageLayoutConfig } from '@/lib/design/layout';
import { HOME_SECTIONS, BRANCH_DETAIL_SECTIONS, getSectionDefs, type PageKey } from '@/lib/design/sections';
import { createAdminClient } from '@/lib/supabase/admin';
import { DesignEditor } from '@/components/admin/design/DesignEditor';
import { HomeRegisterCta, HomeRegisterStats } from '@/components/home/HomeRegisterHero';
import { QuickMenuGrid } from '@/components/home/QuickMenuGrid';
import { InfiniteCarousel } from '@/components/home/carousel/InfiniteCarousel';
import { GaQualityCard } from '@/components/home/carousel/GaQualityCard';
import { NewBranchCard } from '@/components/home/carousel/NewBranchCard';
import type { BranchPreviewData } from '@/components/branch/types';

export const dynamic = 'force-dynamic';

const TABS: { param: string; pageKey: PageKey; label: string }[] = [
  { param: 'home', pageKey: 'home', label: '홈 화면' },
  { param: 'branch', pageKey: 'branch_detail', label: '지점상세' },
];

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line py-10 text-ink-faint">
      <p className="text-sm">{text}</p>
    </div>
  );
}

async function buildHomePreviewNodes() {
  const [gaQuality, latest, stats] = await Promise.all([
    listGaQualityRanking(10),
    listPublicBranches({ sort: 'newest', limit: 10 }),
    getHomeStats(),
  ]);

  const nodesByKey: Record<string, React.ReactNode> = {
    // hero → heroCta + heroStats 분리(2026-08-14). 미리보기도 공개 페이지와 같은 컴포넌트를 쓴다.
    heroCta: <HomeRegisterCta />,
    heroStats: <HomeRegisterStats stats={stats} />,
    quickMenu: <QuickMenuGrid />,
    popularGa: (
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">🏅 우수 GA</h2>
          <span className="flex items-center gap-0.5 text-xs font-medium text-ink-faint">
            더보기 <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
        {gaQuality.length === 0 ? (
          <EmptyRow text="첫 인증 설계사가 나오는 순간 그 지점의 GA가 1위로 시작합니다." />
        ) : (
          <InfiniteCarousel
            durationSec={28}
            itemClassName="w-[190px] sm:w-[210px]"
            items={gaQuality.map((ga, i) => ({ key: ga.gaCompanyId, node: <GaQualityCard ga={ga} rank={i + 1} /> }))}
          />
        )}
      </section>
    ),
    latest: (
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">🆕 신규 등록</h2>
          <span className="flex items-center gap-0.5 text-xs font-medium text-ink-faint">
            더보기 <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
        {latest.length === 0 ? (
          <EmptyRow text="신규 등록된 지점이 없습니다." />
        ) : (
          <InfiniteCarousel
            durationSec={38}
            itemClassName="w-[190px] sm:w-[210px]"
            items={latest.map((b) => ({ key: b.id, node: <NewBranchCard branch={b} /> }))}
          />
        )}
      </section>
    ),
  };

  return HOME_SECTIONS.map((def) => ({ key: def.key, node: nodesByKey[def.key] }));
}

async function findSampleBranchDetail(): Promise<BranchPreviewData | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('ga_branch')
    .select('slug')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.slug) return null;

  const branch = await getPublicBranchDetail(data.slug);
  if (!branch) return null;

  const siblings = await listPublicBranches({ gaCompanyIds: [branch.gaCompany.id] });

  return {
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
    shortTagline: branch.shortTagline,
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
}

export default async function DesignEditorPage({ params }: { params: { page: string } }) {
  const tab = TABS.find((t) => t.param === params.page);
  if (!tab) {
    notFound();
  }

  const [layoutConfig, preview] = await Promise.all([
    getPageLayoutConfig(tab.pageKey),
    tab.pageKey === 'home'
      ? buildHomePreviewNodes().then((nodes) => ({ kind: 'sections' as const, nodes }))
      : findSampleBranchDetail().then((data) => ({ kind: 'branch' as const, data })),
  ]);

  const sectionDefs = tab.pageKey === 'home' ? HOME_SECTIONS : BRANCH_DETAIL_SECTIONS;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">디자인 편집</h1>
        <p className="text-sm text-muted-foreground">섹션 순서·노출·여백을 기기별로 조정하고 저장하세요.</p>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.param}
            href={`/admin/design/${t.param}`}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${
              t.param === params.page ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <DesignEditor pageKey={tab.pageKey} sectionDefs={getSectionDefs(tab.pageKey)} initialConfig={layoutConfig} preview={preview} />
    </div>
  );
}
