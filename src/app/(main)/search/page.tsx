import { Search, SearchX } from 'lucide-react';
import { listPublicGaCompanies } from '@/lib/public/ga';
import { listPublicBranches } from '@/lib/public/branch';
import { BranchCard } from '@/components/branch/BranchCard';
import { GaCard } from '@/components/ga/GaCard';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();

  const [gaResults, branchResults] = q
    ? await Promise.all([listPublicGaCompanies({ q }), listPublicBranches({ q, sort: 'recommended' })])
    : [[], []];

  const totalCount = gaResults.length + branchResults.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-4">
      <form action="/search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="지역, GA명, 지점명으로 검색"
          autoFocus
          className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-sm text-ink shadow-card outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:shadow-card-hover"
        />
      </form>

      {!q ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-20 text-ink-faint">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Search className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm">GA명 또는 지점명을 검색해보세요.</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-20 text-ink-faint">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken">
            <SearchX className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm">
            <span className="font-bold text-ink">&ldquo;{q}&rdquo;</span>에 대한 검색 결과가 없습니다.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-ink-faint">
            <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span> 검색 결과{' '}
            <span className="font-semibold text-brand-600">{totalCount}</span>건
          </p>

          {gaResults.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-ink">
                GA
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-600">{gaResults.length}</span>
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {gaResults.map((ga) => (
                  <GaCard key={ga.id} ga={ga} />
                ))}
              </div>
            </section>
          )}

          {gaResults.length > 0 && branchResults.length > 0 && <div className="h-px bg-line" />}

          {branchResults.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-ink">
                지점
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-600">
                  {branchResults.length}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {branchResults.map((branch) => (
                  <BranchCard key={branch.id} branch={branch} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
