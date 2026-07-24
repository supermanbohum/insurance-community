import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { listPublicBranches } from '@/lib/public/branch';
import { IconMenuGrid } from '@/components/home/IconMenuGrid';
import { HeroSearch } from '@/components/home/HeroSearch';
import { PlatformStats } from '@/components/home/PlatformStats';
import { RegionQuickLinks } from '@/components/home/RegionQuickLinks';
import { MapPreviewSection } from '@/components/home/MapPreviewSection';
import { HomeFooter } from '@/components/home/HomeFooter';
import { BranchCard } from '@/components/branch/BranchCard';

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
  const [recommended, popular, latest] = await Promise.all([
    listPublicBranches({ sort: 'recommended', limit: 4 }),
    listPublicBranches({ sort: 'views', limit: 6 }),
    listPublicBranches({ sort: 'newest', limit: 4 }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-9 px-4 pb-6 pt-4">
      <HeroSearch />

      <PlatformStats />

      <IconMenuGrid />

      <Section title="이번 주 인기 지점" subtitle="가장 많이 찾아본 지점" moreHref="/search">
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

      <RegionQuickLinks />

      <MapPreviewSection />

      <Section title="추천 지점" subtitle="보험맵이 선정한 우수 지점" moreHref="/search">
        {recommended.length === 0 ? (
          <EmptyRow text="등록된 추천 지점이 없습니다." />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recommended.map((b) => (
              <BranchCard key={b.id} branch={b} />
            ))}
          </div>
        )}
      </Section>

      <Section title="신규 등록 지점" subtitle="최근에 새로 올라온 지점" moreHref="/search">
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
