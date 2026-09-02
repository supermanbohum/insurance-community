'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Maximize2, MapPin } from 'lucide-react';
import { NaverMapView } from '@/components/map/NaverMapView';
import type { MapBranch } from '@/components/map/types';
import type { MapBoundsLike, MapControllerLike } from '@/components/map/mapController';

/**
 * 홈 최상단의 실제 지도(오너 지시 2026-08-27 — 「지도로보기 눌러서 나오는 지도화면,
 * 그거를 메인홈 위에 크게」).
 *
 * 🔴 「지도로 보기」 링크가 아니라 **지도 자체**를 띄운다. 링크는 한 번 더 누르게 만들고,
 *    누르기 전까지는 지점이 어디에 있는지 아무것도 안 보인다.
 *
 * /map 의 전체 화면(필터·목록·바텀시트)을 그대로 옮기지는 않는다 — 홈에서 필요한 것은
 * **어디에 지점이 있는지 한눈에 보이는 것**이고, 조작은 「크게 보기」로 /map 에 넘긴다.
 * 마커를 누르면 그 지점 상세로 바로 간다.
 */
export function HomeMapSection({ branches }: { branches: MapBranch[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<MapControllerLike | null>(null);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const target = branches.find((b) => b.id === id);
      if (target) router.push(`/branch/${target.slug}`);
    },
    [branches, router]
  );

  // 홈 지도는 뷰포트 기반 재조회를 하지 않는다 — 서버를 부르지 않고 받아온 것만 그린다.
  const handleBoundsChanged = useCallback((_bounds: MapBoundsLike, _userInitiated: boolean) => {}, []);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-[17px] font-bold text-ink">
            <MapPin className="h-[18px] w-[18px] text-primary" />
            지도에서 지점 찾기
          </h2>
          <p className="mt-1 text-[13px] font-medium leading-[1.55] text-ink-faint [word-break:keep-all]">
            지점을 눌러 바로 확인하세요
          </p>
        </div>
        <Link
          href="/map"
          className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          크게 보기
        </Link>
      </div>

      <div className="relative h-[320px] overflow-hidden rounded-xl border border-line sm:h-[420px]">
        <NaverMapView
          branches={branches}
          selectedId={selectedId}
          onSelect={handleSelect}
          onBoundsChanged={handleBoundsChanged}
          flyToTarget={null}
          onMapReady={(c) => {
            mapRef.current = c;
          }}
        />
      </div>
    </section>
  );
}
