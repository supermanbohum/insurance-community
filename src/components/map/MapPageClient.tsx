'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type L from 'leaflet';
import { Locate, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { SearchFilterButton, type SearchFilterCurrent } from '@/components/search/SearchFilterSheet';
import { MapBranchListItem } from './MapBranchListItem';
import { BranchPreviewCard } from './BranchPreviewCard';
import type { MapBranch } from './types';

const LeafletMapView = dynamic(() => import('./LeafletMapView').then((m) => m.LeafletMapView), {
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
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{ id: string; token: number } | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  useEffect(() => {
    setVisibleIds(null);
    setSelectedId(null);
    setShowSearchArea(false);
  }, [branches]);

  const shownBranches = useMemo(
    () => (visibleIds ? branches.filter((b) => visibleIds.has(b.id)) : branches),
    [branches, visibleIds]
  );

  const selected = shownBranches.find((b) => b.id === selectedId) ?? null;

  function handleSelectFromList(id: string) {
    setSelectedId(id);
    setFlyToTarget({ id, token: Date.now() });
  }

  function handleBoundsChanged(bounds: L.LatLngBounds, userInitiated: boolean) {
    boundsRef.current = bounds;
    if (userInitiated) setShowSearchArea(true);
  }

  function searchThisArea() {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const ids = new Set(
      branches
        .filter((b) => b.lat != null && b.lng != null && bounds.contains([b.lat, b.lng] as [number, number]))
        .map((b) => b.id)
    );
    setVisibleIds(ids);
    setShowSearchArea(false);
  }

  function locateMe() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 0.6 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="flex h-[calc(100dvh-57px-76px)] flex-col lg:h-[calc(100dvh-57px)]">
      <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <SearchCombobox
            defaultValue={filterCurrent.query}
            placeholder="지역, GA명, 지점명 검색"
            inputClassName="w-full rounded-full border border-line bg-surface-sunken py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:shadow-card"
            basePath="/map"
          />
        </div>
        <SearchFilterButton current={filterCurrent} regionOptions={regionOptions} gaOptions={gaOptions} basePath="/map" />
      </div>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-[360px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white lg:flex">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-bold text-ink">
              지점 <span className="text-brand-600">{shownBranches.length}</span>곳
            </p>
          </div>
          <div className="flex flex-col gap-2 px-3 pb-4">
            {shownBranches.map((b) => (
              <MapBranchListItem key={b.id} branch={b} active={b.id === selectedId} onClick={() => handleSelectFromList(b.id)} />
            ))}
            {shownBranches.length === 0 && (
              <p className="px-2 py-10 text-center text-sm text-ink-faint">해당 조건으로 등록되어 있는 지점이 없습니다.</p>
            )}
          </div>
        </aside>

        <div className="relative min-h-0 flex-1">
          <LeafletMapView
            branches={shownBranches}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBoundsChanged={handleBoundsChanged}
            flyToTarget={flyToTarget}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
          />

          {showSearchArea && (
            <button
              type="button"
              onClick={searchThisArea}
              className="absolute left-1/2 top-4 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-brand-600 shadow-pop ring-1 ring-line transition-transform active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5" />
              현재 지도에서 검색
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
            <div className="p-3">
              <BranchPreviewCard branch={selected} onClose={() => setSelectedId(null)} />
            </div>
          ) : (
            <div className="flex max-h-[45vh] flex-col rounded-t-3xl border-t border-line bg-white shadow-2xl">
              <div className="flex items-center justify-center pt-2">
                <span className="h-1 w-10 rounded-full bg-line" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-sm font-bold text-ink">
                  지점 <span className="text-brand-600">{shownBranches.length}</span>곳
                </p>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-4">
                {shownBranches.map((b) => (
                  <MapBranchListItem
                    key={b.id}
                    branch={b}
                    active={b.id === selectedId}
                    onClick={() => handleSelectFromList(b.id)}
                  />
                ))}
                {shownBranches.length === 0 && (
                  <p className="px-2 py-10 text-center text-sm text-ink-faint">해당 조건으로 등록되어 있는 지점이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
