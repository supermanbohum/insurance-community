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
    bbox?: string;
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

  // "현재 지도에서 검색" 버튼 클릭 시 지도 뷰포트(Bounds)를 URL에 담아 서버에서 그 영역만 다시 조회한다.
  const bboxParts = searchParams.bbox?.split(',').map(Number);
  const bounds =
    bboxParts?.length === 4 && bboxParts.every((n) => Number.isFinite(n))
      ? { south: bboxParts[0], west: bboxParts[1], north: bboxParts[2], east: bboxParts[3] }
      : undefined;

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
          bounds,
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
    kakaoContactHref: b.kakaoContactHref,
    contactClickCount: b.contactClickCount,
    tagline: b.tagline,
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
