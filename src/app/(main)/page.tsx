import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { listPublicBranches, getHomeStats } from '@/lib/public/branch';
import { getPageLayoutConfig } from '@/lib/design/layout';
import { HOME_SECTIONS, type Device } from '@/lib/design/sections';
import { ResponsiveSection } from '@/components/shared/ResponsiveSection';
import { IconMenuGrid } from '@/components/home/IconMenuGrid';
import { HomeRegisterHero } from '@/components/home/HomeRegisterHero';
import { QuickActionCards } from '@/components/home/QuickActionCards';
import { RegionQuickLinks } from '@/components/home/RegionQuickLinks';
import { CompanyQuickLinks } from '@/components/home/CompanyQuickLinks';
import { HomeMapHero } from '@/components/home/HomeMapHero';
import { HomeFooter } from '@/components/home/HomeFooter';
import { BranchCard } from '@/components/branch/BranchCard';
import type { MapBranch } from '@/components/map/types';

// (main)/layout.tsx가 매 요청마다 getCurrentUser()로 로그인 쿠키를 읽기 때문에
// (헤더에 로그인 상태를 정확히 보여주려면 필요) 이 레이아웃 아래 페이지는 전부
// 어차피 dynamic 렌더링된다 - 여기서 revalidate를 걸어도 실제로는 적용되지 않는다.
// 그래도 데이터 조회 함수(listPublicBranches/listSidoGroups)는 cookies()를 안 쓰는
// 공개 클라이언트로 옮겨뒀다 - 추후 헤더의 로그인 체크를 클라이언트 사이드로 옮기면
// 그때는 이 페이지가 바로 캐시 가능해진다.
export const dynamic = 'force-dynamic';

function Section({
  title,
  subtitle,
  moreHref,
  children,
}: {
  title: string;
  subtitle?: string;
  moreHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
        </div>
        <Link
          href={moreHref}
          className="flex items-center gap-0.5 text-xs font-medium text-ink-faint transition-colors hover:text-brand-600"
        >
          더보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [mapBranches, popular, latest, stats, layoutConfig] = await Promise.all([
    listPublicBranches({ sort: 'recommended' }),
    listPublicBranches({ sort: 'views', limit: 6 }),
    listPublicBranches({ sort: 'newest', limit: 4 }),
    getHomeStats(),
    getPageLayoutConfig('home'),
  ]);

  const heroMapBranches: MapBranch[] = mapBranches.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    gaCompanyName: b.gaCompanyName,
    isGaVerified: b.isGaVerified,
    sidoName: b.sidoName,
    sigunguName: b.sigunguName,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    operationType: b.operationType,
    hasActiveRecruit: b.hasActiveRecruit,
    viewCount: b.viewCount,
    mainImageUrl: b.mainImageUrl,
    kakaoContactHref: b.kakaoContactHref,
    contactClickCount: b.contactClickCount,
    tagline: b.tagline,
  }));

  const ctaLabel = layoutConfig.desktop.find((s) => s.key === 'hero')?.text?.ctaLabel ?? '지점 등록하기';

  const nodesByKey: Record<(typeof HOME_SECTIONS)[number]['key'], React.ReactNode> = {
    hero: <HomeRegisterHero stats={stats} ctaLabel={ctaLabel} />,
    map: <HomeMapHero branches={heroMapBranches} />,
    quickActions: <QuickActionCards />,
    iconMenu: <IconMenuGrid />,
    popularGa: (
      <Section title="🔥 인기 GA" subtitle="가장 많이 찾아본 지점" moreHref="/search?sort=views">
        {popular.length === 0 ? (
          <EmptyRow text="아직 조회 데이터가 없습니다." />
        ) : (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {popular.map((b, i) => (
              <BranchCard key={b.id} branch={b} rank={i + 1} showMeta className="w-[168px] shrink-0 sm:w-[190px]" />
            ))}
          </div>
        )}
      </Section>
    ),
    regionLinks: <RegionQuickLinks />,
    companyLinks: <CompanyQuickLinks />,
    latest: (
      <Section title="🆕 신규 등록" subtitle="최근에 새로 올라온 지점" moreHref="/search?sort=newest">
        {latest.length === 0 ? (
          <EmptyRow text="신규 등록된 지점이 없습니다." />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {latest.map((b) => (
              <BranchCard key={b.id} branch={b} />
            ))}
          </div>
        )}
      </Section>
    ),
    footer: <HomeFooter />,
  };

  const devices: Device[] = ['mobile', 'tablet', 'desktop'];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pb-6 pt-4">
      {HOME_SECTIONS.map((def) => (
        <ResponsiveSection
          key={def.key}
          sectionKey={def.key}
          config={Object.fromEntries(
            devices.map((device) => [device, layoutConfig[device].find((s) => s.key === def.key)])
          ) as Record<Device, (typeof layoutConfig.mobile)[number] | undefined>}
        >
          {nodesByKey[def.key]}
        </ResponsiveSection>
      ))}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line py-10 text-ink-faint">
      <p className="text-sm">{text}</p>
    </div>
  );
}
