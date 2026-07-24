import { listPublicBranches, type BranchSortOption } from '@/lib/public/branch';
import { listGaFilterOptions, splitRegisteredGaIds } from '@/lib/public/ga-directory';
import { listSidoGroups } from '@/lib/public/region';
import { MapPageClient } from '@/components/map/MapPageClient';
import type { MapBranch } from '@/components/map/types';

export const dynamic = 'force-dynamic';

export default async function MapPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    region?: string;
    ga?: string;
    minPlanners?: string;
    parking?: string;
    structure?: string;
  };
}) {
  const q = searchParams.q?.trim() ?? '';
  const region = searchParams.region?.trim() ?? '';
  const gaIds = searchParams.ga ? searchParams.ga.split(',').filter(Boolean) : [];
  const minPlanners = Number(searchParams.minPlanners) > 0 ? Number(searchParams.minPlanners) : 0;
  const parking: '' | 'true' | 'false' =
    searchParams.parking === 'true' ? 'true' : searchParams.parking === 'false' ? 'false' : '';
  const structure: '' | 'direct' | 'branch' =
    searchParams.structure === 'direct' ? 'direct' : searchParams.structure === 'branch' ? 'branch' : '';

  const sort: BranchSortOption = 'recommended';
  const { registeredIds: registeredGaIds, hasUnregisteredOnly } = splitRegisteredGaIds(gaIds);

  const [branchResults, regions, allGaOptions] = await Promise.all([
    hasUnregisteredOnly
      ? Promise.resolve([])
      : listPublicBranches({
          q: q || undefined,
          sort,
          sidoCode: region || undefined,
          gaCompanyIds: registeredGaIds.length > 0 ? registeredGaIds : undefined,
          minPlannerCount: minPlanners || undefined,
          parkingAvailable: parking === 'true' ? true : parking === 'false' ? false : undefined,
          operationType: structure || undefined,
        }),
    listSidoGroups(),
    listGaFilterOptions(),
  ]);

  const branches: MapBranch[] = branchResults.map((b) => ({
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
  }));

  return (
    <MapPageClient
      branches={branches}
      filterCurrent={{ query: q, sort, region, gaIds, minPlanners, parking, structure }}
      regionOptions={regions}
      gaOptions={allGaOptions.map((ga) => ({ id: ga.id, name: ga.name }))}
    />
  );
}
