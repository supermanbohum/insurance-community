import { Search, SearchX } from 'lucide-react';
import { listGaFilterOptions, splitRegisteredGaIds } from '@/lib/public/ga-directory';
import { listPublicBranches, type BranchSortOption } from '@/lib/public/branch';
import { listSidoGroups } from '@/lib/public/region';
import { BranchCard } from '@/components/branch/BranchCard';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchFilterButton } from '@/components/search/SearchFilterSheet';
import { SearchFilterChips, type FilterChip } from '@/components/search/SearchFilterChips';

export const dynamic = 'force-dynamic';

const VALID_SORTS: BranchSortOption[] = ['recommended', 'newest', 'views'];
const PLANNER_TIER_LABELS: Record<number, string> = { 30: '30명 이상', 50: '50명 이상', 100: '100명 이상', 300: '300명 이상' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    sort?: string;
    region?: string;
    ga?: string;
    minPlanners?: string;
    parking?: string;
    structure?: string;
  };
}) {
  const q = searchParams.q?.trim() ?? '';
  const sort: BranchSortOption = VALID_SORTS.includes(searchParams.sort as BranchSortOption)
    ? (searchParams.sort as BranchSortOption)
    : 'recommended';
  const region = searchParams.region?.trim() ?? '';
  const gaIds = searchParams.ga ? searchParams.ga.split(',').filter(Boolean) : [];
  const minPlanners = Number(searchParams.minPlanners) > 0 ? Number(searchParams.minPlanners) : 0;
  const parking: '' | 'true' | 'false' =
    searchParams.parking === 'true' ? 'true' : searchParams.parking === 'false' ? 'false' : '';
  const structure: '' | 'direct' | 'branch' =
    searchParams.structure === 'direct' ? 'direct' : searchParams.structure === 'branch' ? 'branch' : '';

  const hasFilters = Boolean(region) || gaIds.length > 0 || minPlanners > 0 || Boolean(parking) || Boolean(structure);
  const shouldSearch = Boolean(q) || hasFilters;
  const { registeredIds: registeredGaIds, hasUnregisteredOnly } = splitRegisteredGaIds(gaIds);

  const [branchResults, regions, allGaOptions] = await Promise.all([
    shouldSearch && !hasUnregisteredOnly
      ? listPublicBranches({
          q: q || undefined,
          sort,
          sidoCode: region || undefined,
          gaCompanyIds: registeredGaIds.length > 0 ? registeredGaIds : undefined,
          minPlannerCount: minPlanners || undefined,
          parkingAvailable: parking === 'true' ? true : parking === 'false' ? false : undefined,
          operationType: structure || undefined,
        })
      : Promise.resolve([]),
    listSidoGroups(),
    listGaFilterOptions(),
  ]);

  const totalCount = branchResults.length;

  const gaNameById = new Map(allGaOptions.map((ga) => [ga.id, ga.name]));
  const regionNameByCode = new Map(regions.map((r) => [r.sidoCode, r.sidoName]));

  function paramsWithout(exclude: 'region' | 'ga' | 'minPlanners' | 'parking' | 'structure', excludeGaId?: string): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (sort !== 'recommended') params.set('sort', sort);
    if (region && exclude !== 'region') params.set('region', region);
    const nextGaIds = exclude === 'ga' ? gaIds.filter((id) => id !== excludeGaId) : gaIds;
    if (nextGaIds.length > 0) params.set('ga', nextGaIds.join(','));
    if (minPlanners > 0 && exclude !== 'minPlanners') params.set('minPlanners', String(minPlanners));
    if (parking && exclude !== 'parking') params.set('parking', parking);
    if (structure && exclude !== 'structure') params.set('structure', structure);
    return params.toString();
  }

  const chips: FilterChip[] = [
    ...(region
      ? [{ key: 'region', label: regionNameByCode.get(region) ?? region, href: `/search?${paramsWithout('region')}` }]
      : []),
    ...(structure
      ? [{ key: 'structure', label: structure === 'direct' ? '직영' : '지사', href: `/search?${paramsWithout('structure')}` }]
      : []),
    ...gaIds.map((id) => ({
      key: `ga-${id}`,
      label: gaNameById.get(id) ?? id,
      href: `/search?${paramsWithout('ga', id)}`,
    })),
    ...(minPlanners > 0
      ? [{ key: 'minPlanners', label: PLANNER_TIER_LABELS[minPlanners] ?? `${minPlanners}명 이상`, href: `/search?${paramsWithout('minPlanners')}` }]
      : []),
    ...(parking
      ? [{ key: 'parking', label: parking === 'true' ? '주차 가능' : '주차 불가', href: `/search?${paramsWithout('parking')}` }]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchCombobox
            defaultValue={q}
            placeholder="지역, GA명, 지점명으로 검색"
            autoFocus={!q}
            inputClassName="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-sm text-ink shadow-card outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:shadow-card-hover"
          />
        </div>
        <SearchFilterButton
          current={{ query: q, sort, region, gaIds, minPlanners, parking, structure }}
          regionOptions={regions}
          gaOptions={allGaOptions.map((ga) => ({ id: ga.id, name: ga.name }))}
        />
      </div>

      <SearchFilterChips chips={chips} />

      {!shouldSearch ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-20 text-ink-faint">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Search className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm">지점명 또는 소속 회사명을 검색하거나 필터를 사용해보세요.</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-20 text-ink-faint">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken">
            <SearchX className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm">
            {q && !hasFilters ? (
              <>
                <span className="font-bold text-ink">&ldquo;{q}&rdquo;</span>에 대한 검색 결과가 없습니다.
              </>
            ) : (
              '해당 조건으로 등록되어 있는 지점이 없습니다.'
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-faint">
              {q && (
                <>
                  <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span>{' '}
                </>
              )}
              검색 결과 <span className="font-semibold text-brand-600">{totalCount}</span>건
            </p>
            <SearchFilters
              query={q}
              sort={sort}
              region={region}
              gaIds={gaIds}
              minPlanners={minPlanners}
              parking={parking}
              structure={structure}
            />
          </div>

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
                  <BranchCard key={branch.id} branch={branch} highlightQuery={q} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
