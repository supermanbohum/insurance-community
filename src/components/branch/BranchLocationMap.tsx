'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { MapBranch } from '@/components/map/types';

const LeafletMapView = dynamic(() => import('@/components/map/LeafletMapView').then((m) => m.LeafletMapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-sm text-ink-faint">
      지도를 불러오는 중…
    </div>
  ),
});

/**
 * 지점 상세 페이지용 미니맵 - LeafletMapView를 그대로 재사용하되 지점 좌표 하나로
 * 바로 확대해서 보여준다(전국 뷰에서 시작하지 않음). 좌표가 없으면 아무것도 렌더링하지 않는다.
 */
export function BranchLocationMap({
  branchId,
  branchSlug,
  branchName,
  gaCompanyName,
  address,
  lat,
  lng,
}: {
  branchId: string;
  branchSlug: string;
  branchName: string;
  gaCompanyName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const noop = useCallback(() => {}, []);

  if (lat == null || lng == null) return null;

  const branch: MapBranch = {
    id: branchId,
    slug: branchSlug,
    name: branchName,
    gaCompanyName,
    isGaVerified: false,
    sidoName: null,
    sigunguName: null,
    address: address ?? '',
    lat,
    lng,
    operationType: 'direct',
    hasActiveRecruit: false,
    viewCount: 0,
    mainImageUrl: null,
  };

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-line">
      <LeafletMapView
        branches={[branch]}
        selectedId={branchId}
        onSelect={noop}
        onBoundsChanged={noop}
        flyToTarget={null}
        initialCenter={[lat, lng]}
        initialZoom={15}
      />
    </div>
  );
}
