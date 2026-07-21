import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { listPublicBranches } from '@/lib/public/branch';
import { IconMenuGrid } from '@/components/home/IconMenuGrid';
import { HeroSearch } from '@/components/home/HeroSearch';
import { RegionQuickLinks } from '@/components/home/RegionQuickLinks';
import { MapPreviewSection } from '@/components/home/MapPreviewSection';
import { HomeFooter } from '@/components/home/HomeFooter';
import { BranchCard } from '@/components/branch/BranchCard';

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
  const [recommended, popular, latest] = await Promise.all([
    listPublicBranches({ sort: 'recommended', limit: 4 }),
    listPublicBranches({ sort: 'views', limit: 6 }),
    listPublicBranches({ sort: 'newest', limit: 4 }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-9 px-4 pb-6 pt-4">
      <HeroSearch />

      <IconMenuGrid />

      <Section title="이번 주 인기 GA" subtitle="가장 많이 찾아본 지점" moreHref="/ga">
        {popular.length === 0 ? (
          <EmptyRow text="아직 조회 데이터가 없습니다." />
        ) : (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {popular.map((b, i) => (
              <BranchCard key={b.id} branch={b} rank={i + 1} className="w-[168px] shrink-0 sm:w-[190px]" />
            ))}
          </div>
        )}
      </Section>

      <RegionQuickLinks />

      <MapPreviewSection />

      <Section title="추천 GA" subtitle="보험맵이 선정한 우수 지점" moreHref="/ga">
        {recommended.length === 0 ? (
          <EmptyRow text="등록된 추천 지점이 없습니다." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recommended.map((b) => (
              <BranchCard key={b.id} branch={b} />
            ))}
          </div>
        )}
      </Section>

      <Section title="신규 등록 GA" subtitle="최근에 새로 올라온 지점" moreHref="/ga">
        {latest.length === 0 ? (
          <EmptyRow text="신규 등록된 지점이 없습니다." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {latest.map((b) => (
              <BranchCard key={b.id} branch={b} />
            ))}
          </div>
        )}
      </Section>

      <HomeFooter />
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
