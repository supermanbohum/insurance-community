import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { listSidoGroups } from '@/lib/public/region';

const PRIORITY_SIDO_CODES = ['11', '41', '28', '26'];

export async function RegionQuickLinks() {
  const groups = await listSidoGroups();
  const byCode = new Map(groups.map((g) => [g.sidoCode, g]));

  const priority = PRIORITY_SIDO_CODES.map((code) => byCode.get(code)).filter(
    (g): g is NonNullable<typeof g> => Boolean(g)
  );
  const rest = groups.filter((g) => !PRIORITY_SIDO_CODES.includes(g.sidoCode));
  const ordered = [...priority, ...rest];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">지역으로 찾기</h2>
          <p className="mt-0.5 text-xs text-ink-faint">원하는 지역의 GA를 바로 확인하세요</p>
        </div>
        <Link
          href="/region"
          className="flex items-center gap-0.5 text-xs font-medium text-ink-faint transition-colors hover:text-brand-600"
        >
          전체보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {ordered.map((g) => (
          <Link
            key={g.sidoCode}
            href={`/region/${g.sidoCode}`}
            className="shrink-0 rounded-full border border-line bg-surface-card px-4 py-2 text-sm font-medium text-ink-soft shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600 hover:shadow-card-hover"
          >
            {g.sidoName}
          </Link>
        ))}
      </div>
    </section>
  );
}
