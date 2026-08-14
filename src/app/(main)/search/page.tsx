import type { Metadata } from 'next';
import { listGaFilterOptions, splitRegisteredGaIds } from '@/lib/public/ga-directory';
import { listPublicBranches, type BranchSortOption } from '@/lib/public/branch';
import { listSidoGroups, listAllSigunguRegions } from '@/lib/public/region';
import { BranchCard } from '@/components/branch/BranchCard';
import { EmptyBranchResults } from '@/components/branch/EmptyBranchResults';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchFilterButton } from '@/components/search/SearchFilterSheet';
import { SearchFilterChips, type FilterChip } from '@/components/search/SearchFilterChips';
import { INCOME_TIER_SHORT_LABEL } from '@/lib/planners/tier';
import type { PlannerIncomeTier } from '@/types/database';

export const dynamic = 'force-dynamic';

// 검색 결과는 필터 조합에 따라 같은 지점이 여러 쿼리스트링으로 중복 노출될 수 있어
// (전형적인 faceted-search 중복 콘텐츠 문제) canonical은 항상 필터 없는 기본 /search로
// 고정한다 - 특정 쿼리 조합 URL이 색인되어 서로 경쟁하는 것을 막는다.
export const metadata: Metadata = {
  title: '전국 보험대리점 검색',
  description: '지역, GA명, 지점명으로 전국 보험대리점을 검색하세요. 채용중인 지점, 주차 가능 여부까지 필터로 찾을 수 있습니다.',
  alternates: { canonical: '/search' },
};

const VALID_SORTS: BranchSortOption[] = ['recommended', 'newest', 'views'];
const PLANNER_TIER_LABELS: Record<number, string> = { 30: '30명 이상', 50: '50명 이상', 100: '100명 이상', 300: '300명 이상' };

/** 0건 카드에 검색어를 인용할 때만 쓴다 - 긴 질의를 그대로 넣으면 제목이 여러 줄로
 * 늘어나 카드가 무너진다(SPEC-038 C②). 인용 자체는 유지해야 사용자가 무엇으로 찾았는지 안다. */
function truncateQuery(value: string) {
  return value.length > 20 ? `${value.slice(0, 20)}…` : value;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    sort?: string;
    region?: string;
    sigungu?: string;
    ga?: string;
    minPlanners?: string;
    parking?: string;
    structure?: string;
    highIncome?: string;
    tiers?: string;
  };
}) {
  const q = searchParams.q?.trim() ?? '';
  const sort: BranchSortOption = VALID_SORTS.includes(searchParams.sort as BranchSortOption)
    ? (searchParams.sort as BranchSortOption)
    : 'recommended';
  const region = searchParams.region?.trim() ?? '';
  const sigunguParam = searchParams.sigungu?.trim() ?? '';
  const gaIds = searchParams.ga ? searchParams.ga.split(',').filter(Boolean) : [];
  const minPlanners = Number(searchParams.minPlanners) > 0 ? Number(searchParams.minPlanners) : 0;
  const parking: '' | 'true' | 'false' =
    searchParams.parking === 'true' ? 'true' : searchParams.parking === 'false' ? 'false' : '';
  const structure: '' | 'direct' | 'branch' =
    searchParams.structure === 'direct' ? 'direct' : searchParams.structure === 'branch' ? 'branch' : '';
  const hasHighIncomePlanners = searchParams.highIncome === '1';
  const plannerTiers = (searchParams.tiers ? searchParams.tiers.split(',').filter(Boolean) : []) as PlannerIncomeTier[];

  const hasFilters =
    Boolean(region) || gaIds.length > 0 || minPlanners > 0 || Boolean(parking) || Boolean(structure) || hasHighIncomePlanners;
  // 🔴 검색어·필터가 없어도 **전체 지점을 그대로 보여준다**(오너 지시 2026-08-14:
  // "회사별 찾기 시 필터를 설정하지 않으면 전체 지점이 나오고"). 예전에는 shouldSearch
  // 게이트가 있어 무필터 진입 시 「어떤 지점을 찾으시나요?」 빈 상태만 보였다(SPEC-038 B).
  // 이제 빈 상태 카드는 정말로 0건일 때만 나온다.
  const hasExplicitSort = Boolean(searchParams.sort);
  const { registeredIds: registeredGaIds, hasUnregisteredOnly } = splitRegisteredGaIds(gaIds);

  const [rawBranchResults, regions, allSigunguRegions, allGaOptions] = await Promise.all([
    !hasUnregisteredOnly
      ? listPublicBranches({
          q: q || undefined,
          sort,
          // B2 - 시/군/구까지 고른 경우 정확히 그 region_id 하나로 좁힌다(사이드코드
          // 광역 매칭보다 우선). sigunguParam이 region에 안 속하면 아래에서 무시된다.
          regionId: sigunguParam || undefined,
          sidoCode: !sigunguParam && region ? region : undefined,
          gaCompanyIds: registeredGaIds.length > 0 ? registeredGaIds : undefined,
          minPlannerCount: minPlanners || undefined,
          parkingAvailable: parking === 'true' ? true : parking === 'false' ? false : undefined,
          operationType: structure || undefined,
          hasHighIncomePlanners: hasHighIncomePlanners || undefined,
          plannerTiers: plannerTiers.length > 0 ? plannerTiers : undefined,
        })
      : Promise.resolve([]),
    listSidoGroups(),
    listAllSigunguRegions(),
    listGaFilterOptions(),
  ]);

  // sigunguParam이 region에 속하지 않는 낡은/조작된 링크면 무시한다(2단 드릴다운이라
  // 시/도 없이 시/군/구만 오는 조합은 애초에 유효하지 않다).
  const sigungu = sigunguParam && allSigunguRegions.some((s) => s.regionId === sigunguParam && s.sidoCode === region) ? sigunguParam : '';

  // 🔴 전체 지점 뷰(검색어·필터·명시 정렬이 전부 없는 기본 진입)의 정렬은
  // **1. 메타리치 소속 먼저 → 2. 지점명 가나다순**이다(오너 지시 2026-08-14).
  // 검색어가 있거나 sort를 명시했으면(newest/views, 홈 더보기 링크 등) 그쪽을 존중한다.
  // DB 정렬로는 "특정 GA 우선"을 못 표현해서(PostgREST) JS 후처리로 정렬한다 -
  // 전체 지점 수가 수백 단위라 비용이 없다.
  const isPlainDirectoryView = !q && !hasFilters && !hasExplicitSort;
  const branchResults = isPlainDirectoryView
    ? [...rawBranchResults].sort((a, b) => {
        const aMeta = a.gaCompanyName === '메타리치' ? 0 : 1;
        const bMeta = b.gaCompanyName === '메타리치' ? 0 : 1;
        if (aMeta !== bMeta) return aMeta - bMeta;
        return a.name.localeCompare(b.name, 'ko');
      })
    : rawBranchResults;

  const totalCount = branchResults.length;

  const gaNameById = new Map(allGaOptions.map((ga) => [ga.id, ga.name]));
  const regionNameByCode = new Map(regions.map((r) => [r.sidoCode, r.sidoName]));
  const sigunguNameById = new Map(allSigunguRegions.map((s) => [s.regionId, s.sigunguName]));

  function paramsWithout(
    exclude: 'region' | 'sigungu' | 'ga' | 'minPlanners' | 'parking' | 'structure' | 'highIncome',
    excludeGaId?: string
  ): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (sort !== 'recommended') params.set('sort', sort);
    if (region && exclude !== 'region') params.set('region', region);
    // 시/도를 뺄 때는 그 아래 시/군/구도 같이 뺀다 - 상위 없이 하위만 남는 조합은 없다.
    if (sigungu && exclude !== 'sigungu' && exclude !== 'region') params.set('sigungu', sigungu);
    const nextGaIds = exclude === 'ga' ? gaIds.filter((id) => id !== excludeGaId) : gaIds;
    if (nextGaIds.length > 0) params.set('ga', nextGaIds.join(','));
    if (minPlanners > 0 && exclude !== 'minPlanners') params.set('minPlanners', String(minPlanners));
    if (parking && exclude !== 'parking') params.set('parking', parking);
    if (structure && exclude !== 'structure') params.set('structure', structure);
    if (hasHighIncomePlanners && exclude !== 'highIncome') {
      params.set('highIncome', '1');
      if (plannerTiers.length > 0) params.set('tiers', plannerTiers.join(','));
    }
    return params.toString();
  }

  const chips: FilterChip[] = [
    ...(region
      ? [
          {
            key: 'region',
            label: sigungu ? `${regionNameByCode.get(region) ?? region} ${sigunguNameById.get(sigungu) ?? ''}` : regionNameByCode.get(region) ?? region,
            href: `/search?${paramsWithout('region')}`,
          },
        ]
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
    ...(hasHighIncomePlanners
      ? [
          {
            key: 'highIncome',
            label:
              plannerTiers.length > 0
                ? `🏆 고소득 설계사(${plannerTiers.map((t) => INCOME_TIER_SHORT_LABEL[t]).join(',')})`
                : '🏆 고소득 설계사',
            href: `/search?${paramsWithout('highIncome')}`,
          },
        ]
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
            inputClassName="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-base text-ink shadow-card outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:shadow-card-hover"
          />
        </div>
        <SearchFilterButton
          current={{ query: q, sort, region, sigungu, gaIds, minPlanners, parking, structure, hasHighIncomePlanners, plannerTiers }}
          regionOptions={regions}
          sigunguOptions={allSigunguRegions}
          gaOptions={allGaOptions.map((ga) => ({ id: ga.id, name: ga.name }))}
        />
      </div>

      <SearchFilterChips chips={chips} />

      {/* 🔴 「어떤 지점을 찾으시나요?」 빈 상태(SPEC-038 B)는 없어졌다 - 무필터 진입도
          전체 지점 목록을 그대로 보여준다(오너 지시 2026-08-14). 빈 카드는 정말 0건일 때만. */}
      {totalCount === 0 && !q && !hasFilters ? (
        // 무검색·무필터인데 0건 = 사이트에 공개 지점 자체가 없다.
        <EmptyBranchResults
          icon="building"
          title="아직 등록된 지점이 없습니다"
          description="보험맵은 지금 첫 지점들을 모으고 있습니다. 지금 등록하면 지도의 첫 자리를 가져갑니다."
          secondaryAction={{ label: '지도에서 보기', href: '/map' }}
        />
      ) : totalCount === 0 ? (
        // SPEC-038 C - 질의/필터를 걸었는데 0건.
        // 필터가 걸려 있으면 "조건을 지우는 것"이 1순위 해법이라 그쪽을 solid로 올린다.
        <EmptyBranchResults
          icon="search"
          title={q && !hasFilters ? `"${truncateQuery(q)}"에 대한 검색 결과가 아직 없습니다` : '해당 조건으로 등록된 지점이 아직 없습니다'}
          description={
            hasFilters
              ? '필터를 지우고 다시 찾아보시거나, 우리 지점을 직접 등록하실 수 있습니다.'
              : '찾으시는 지점이 아직 등록되지 않았을 수 있습니다. 직접 등록하실 수 있습니다.'
          }
          secondaryAction={hasFilters ? { label: '필터 초기화', href: q ? `/search?q=${encodeURIComponent(q)}` : '/search' } : { label: '지도에서 보기', href: '/map' }}
          emphasize={hasFilters ? 'secondary' : 'primary'}
        />
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
              sigungu={sigungu}
              gaIds={gaIds}
              minPlanners={minPlanners}
              parking={parking}
              structure={structure}
              hasHighIncomePlanners={hasHighIncomePlanners}
              plannerTiers={plannerTiers}
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
              <div className="grid grid-cols-2 gap-4">
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
