'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

/** ⑨ 우리 동네 순위 지역 선택 - B2(검색 필터)와 동일한 시/도→시/군/구 드릴다운 패턴을
 * 재사용한다(오너 지시로 우선 "만들어만 둔다" 단계라 UI 세부는 콘텐츠팀 결정 전까지
 * 최소 구성으로 둔다 - 배치/문구는 콘텐츠 확정 후 교체). */
export function GaRankingRegionPicker({
  sidoOptions,
  sigunguOptions,
  currentSido,
  currentSigungu,
}: {
  sidoOptions: { sidoCode: string; sidoName: string }[];
  sigunguOptions: { regionId: string; sidoCode: string; sigunguName: string }[];
  currentSido: string;
  currentSigungu: string;
}) {
  const router = useRouter();
  const [draftSido, setDraftSido] = useState(currentSido);

  function go(sido: string, sigungu: string) {
    if (!sido) {
      router.push('/ga-ranking');
      return;
    }
    const params = new URLSearchParams({ region: sido });
    if (sigungu) params.set('sigungu', sigungu);
    router.push(`/ga-ranking?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-sunken p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
        <MapPin className="h-3.5 w-3.5" />
        우리 동네에서 보기
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Pill active={!currentSido} onClick={() => { setDraftSido(''); go('', ''); }}>
          전국
        </Pill>
        {sidoOptions.map((s) => (
          <Pill
            key={s.sidoCode}
            active={currentSido === s.sidoCode}
            onClick={() => {
              setDraftSido(s.sidoCode);
              go(s.sidoCode, '');
            }}
          >
            {s.sidoName.replace(/(특별자치시|특별자치도|광역시|특별시|도)$/, '')}
          </Pill>
        ))}
      </div>
      {(draftSido || currentSido) && (
        <div className="flex flex-wrap gap-1.5">
          <Pill active={!currentSigungu} onClick={() => go(draftSido || currentSido, '')}>
            전체
          </Pill>
          {sigunguOptions
            .filter((s) => s.sidoCode === (draftSido || currentSido))
            .map((s) => (
              <Pill key={s.regionId} active={currentSigungu === s.regionId} onClick={() => go(draftSido || currentSido, s.regionId)}>
                {s.sigunguName}
              </Pill>
            ))}
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors',
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-soft hover:border-brand-200'
      )}
    >
      {children}
    </button>
  );
}
