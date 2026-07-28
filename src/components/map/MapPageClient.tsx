'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Locate, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecentMapView, saveRecentMapView } from '@/lib/map/recentMapView';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { SearchFilterButton, type SearchFilterCurrent } from '@/components/search/SearchFilterSheet';
import { MapBranchListItem } from './MapBranchListItem';
import { BranchPreviewCard } from './BranchPreviewCard';
import { BranchBottomSheet } from './BranchBottomSheet';
import type { MapBoundsLike, MapControllerLike } from './mapController';
import type { MapBranch } from './types';

const NaverMapView = dynamic(() => import('./NaverMapView').then((m) => m.NaverMapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-sm text-ink-faint">
      지도를 불러오는 중…
    </div>
  ),
});

export function MapPageClient({
  branches,
  filterCurrent,
  regionOptions,
  gaOptions,
}: {
  branches: MapBranch[];
  filterCurrent: SearchFilterCurrent;
  regionOptions: { sidoCode: string; sidoName: string }[];
  gaOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{ id: string; token: number } | null>(null);
  const [liveBounds, setLiveBounds] = useState<MapBoundsLike | null>(null);
  const [movedSinceLoad, setMovedSinceLoad] = useState(false);
  const [locating, setLocating] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapControllerLike | null>(null);

  // 최초 화면은 전국이 아니라 마지막으로 보던 지역에서 시작한다 - 위치 권한이 허용되면
  // onMapReady에서 한 번 더 내 위치로 자연스럽게 이동한다(권한 대화상자 때문에 지도
  // 렌더링 자체를 멈추지 않기 위해, 시작 좌표는 동기적으로 즉시 정해둔다).
  const [initialView] = useState(() => {
    const recent = getRecentMapView();
    return recent ? { center: [recent.lat, recent.lng] as [number, number], zoom: recent.zoom } : null;
  });

  // 좌측(모바일: 하단) 리스트는 항상 "지금 화면(Bounds)에 보이는 지점"만 보여준다 - 이미 다
  // 받아온 데이터를 화면에서 걸러내는 것뿐이라 지도를 움직일 때마다 서버를 부르지 않는다.
  const visibleBranches = useMemo(() => {
    if (!liveBounds) return branches;
    return branches.filter((b) => b.lat != null && b.lng != null && liveBounds.contains(b.lat, b.lng));
  }, [branches, liveBounds]);

  const selected = branches.find((b) => b.id === selectedId) ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  function handleSelectFromList(id: string) {
    setSelectedId(id);
    setFlyToTarget({ id, token: Date.now() });
  }

  function handleSelectFromSearch(suggestion: { id: string }) {
    setSelectedId(suggestion.id);
    setFlyToTarget({ id: suggestion.id, token: Date.now() });
  }

  const handleBoundsChanged = useCallback((bounds: MapBoundsLike, userInitiated: boolean) => {
    setLiveBounds(bounds);
    if (userInitiated) {
      setMovedSinceLoad(true);
      saveRecentMapView({ lat: bounds.center.lat, lng: bounds.center.lng, zoom: mapRef.current?.getZoom() ?? 12 });
    }
  }, []);

  // "현재 지도에서 검색" - 지금 뷰포트를 서버에 실제로 다시 조회해 받아온다(필터가 걸린
  // 상태에서 화면 밖으로 스크롤해도 그 지역의 지점을 새로 가져올 수 있도록). 지도 이동마다
  // 자동으로 호출하지 않고 사용자가 버튼을 눌렀을 때만 서버를 부른다.
  function searchThisArea() {
    const bounds = liveBounds;
    if (!bounds) return;
    const bbox = [bounds.south, bounds.west, bounds.north, bounds.east].join(',');
    const params = new URLSearchParams(window.location.search);
    params.set('bbox', bbox);
    router.push(`/map?${params.toString()}`);
    setMovedSinceLoad(false);
  }

  function locateMe() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.flyTo(pos.coords.latitude, pos.coords.longitude, 13);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <SearchCombobox
            defaultValue={filterCurrent.query}
            placeholder="지역, GA명, 지점명 검색"
            inputClassName="w-full rounded-full border border-line bg-surface-sunken py-3 pl-10 pr-4 text-base text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:shadow-card"
            basePath="/map"
            onSelectResult={handleSelectFromSearch}
          />
        </div>
        <SearchFilterButton current={filterCurrent} regionOptions={regionOptions} gaOptions={gaOptions} basePath="/map" />
      </div>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-[360px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white lg:flex">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-bold text-ink">
              지금 화면에 <span className="text-brand-600">{visibleBranches.length}</span>곳
            </p>
          </div>
          <div className="flex flex-col gap-2 px-3 pb-4">
            {visibleBranches.map((b) => (
              <MapBranchListItem key={b.id} branch={b} active={b.id === selectedId} onClick={() => handleSelectFromList(b.id)} />
            ))}
            {visibleBranches.length === 0 && (
              <p className="px-2 py-10 text-center text-sm text-ink-faint">이 화면 범위에는 등록된 지점이 없습니다.</p>
            )}
          </div>
        </aside>

        <div className="relative min-h-0 flex-1">
          <NaverMapView
            branches={branches}
            selectedId={selectedId}
            onSelect={handleSelect}
            onBoundsChanged={handleBoundsChanged}
            flyToTarget={flyToTarget}
            initialCenter={initialView?.center}
            initialZoom={initialView?.zoom}
            myLocation={myLocation}
            onMapReady={(controller) => {
              mapRef.current = controller;
              setLiveBounds(controller.getBounds());

              // 위치 권한이 이미 허용돼 있으면(권한 대화상자 없이 바로 응답) 내 위치로
              // 살짝 이동해 "내 주변 지점"이 먼저 보이게 한다 - 없으면 방금 정한 시작
              // 화면(최근 지역 또는 전국)을 그대로 유지한다.
              if (typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    controller.flyTo(pos.coords.latitude, pos.coords.longitude, 13);
                  },
                  () => {},
                  { enableHighAccuracy: true, timeout: 5000, maximumAge: 5 * 60 * 1000 }
                );
              }
            }}
          />

          {movedSinceLoad && (
            <button
              type="button"
              onClick={searchThisArea}
              className="absolute left-1/2 top-4 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-brand-600 shadow-pop ring-1 ring-line transition-transform active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5" />
              이 지도에서 검색
            </button>
          )}

          <button
            type="button"
            onClick={locateMe}
            aria-label="현재 위치로 이동"
            className="absolute right-3 top-4 z-[500] flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft shadow-pop ring-1 ring-line transition-colors hover:text-brand-600"
          >
            <Locate className={cn('h-5 w-5', locating && 'animate-pulse text-brand-600')} />
          </button>

          {selected && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] hidden lg:block">
              <BranchPreviewCard branch={selected} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[500] lg:hidden">
          {selected ? (
            <BranchBottomSheet branch={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex max-h-[42vh] flex-col rounded-t-3xl border-t border-line bg-white shadow-2xl">
              <div className="flex items-center justify-center pt-2">
                <span className="h-1 w-10 rounded-full bg-line" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-sm font-bold text-ink">
                  지금 화면에 <span className="text-brand-600">{visibleBranches.length}</span>곳
                </p>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-4">
                {visibleBranches.map((b) => (
                  <MapBranchListItem
                    key={b.id}
                    branch={b}
                    active={b.id === selectedId}
                    onClick={() => handleSelectFromList(b.id)}
                  />
                ))}
                {visibleBranches.length === 0 && (
                  <p className="px-2 py-10 text-center text-sm text-ink-faint">이 화면 범위에는 등록된 지점이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
