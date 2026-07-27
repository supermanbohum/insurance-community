'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Locate, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BranchPreviewCard } from '@/components/map/BranchPreviewCard';
import type { MapBranch } from '@/components/map/types';

const LeafletMapView = dynamic(() => import('@/components/map/LeafletMapView').then((m) => m.LeafletMapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-sm text-ink-faint">
      지도를 불러오는 중…
    </div>
  ),
});

export function HomeMapHero({ branches }: { branches: MapBranch[] }) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => branches.find((b) => b.id === selectedId) ?? null, [branches, selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  function locateMe() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      router.push('/map');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        router.push(`/map?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
      },
      () => {
        setLocating(false);
        router.push('/map');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">🗺️ 전국 GA 지도</h2>
          <p className="mt-0.5 text-xs text-ink-faint">지역을 눌러 내 주변 GA를 바로 찾아보세요</p>
        </div>
      </div>

      <div className="relative h-[300px] w-full overflow-hidden rounded-3xl border border-line shadow-card-hover sm:h-[380px]">
        <LeafletMapView
          branches={branches}
          selectedId={selectedId}
          onSelect={handleSelect}
          onBoundsChanged={() => {}}
          flyToTarget={null}
        />

        {!selected && (
          <span className="pointer-events-none absolute left-4 top-4 z-[500] rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-card backdrop-blur">
            🏢 {branches.length.toLocaleString('ko-KR')}개 지점 표시 중
          </span>
        )}

        {selected ? (
          <div className="absolute inset-x-3 bottom-3 z-[500]">
            <BranchPreviewCard branch={selected} onClose={() => setSelectedId(null)} />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={locateMe}
              className="absolute bottom-4 left-4 z-[500] flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow-pop ring-1 ring-line transition-transform active:scale-95"
            >
              <Locate className={cn('h-4 w-4', locating && 'animate-pulse text-brand-600')} />
              내 주변 찾기
            </button>

            <Link
              href="/map"
              className="absolute bottom-4 right-4 z-[500] flex items-center gap-1 rounded-full bg-ink/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition-transform active:scale-95"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              크게 보기
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
