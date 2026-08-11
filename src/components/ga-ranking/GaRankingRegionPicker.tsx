'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

/** ⑨ 「우리 동네 우수GA」 지역 선택 - B2(검색 필터)와 동일한 시/도→시/군/구 드릴다운
 * 패턴을 재사용한다. 전국↔지역이 같은 목록의 필터로 동작해야 "우리 동네"가 우수GA의
 * 하위 개념임이 전달된다(CTO 확정 - 별도 섹션/페이지를 만들지 않는 이유).
 *
 * ⚠️ 콘텐츠 확정 사항 중 "선택값 로컬 저장 → 재방문 시 유지"는 아직 넣지 않았다.
 * 이 세션의 브라우저 패널이 표시되지 않는 상태(document.hidden=true)라 페이지가
 * 하이드레이션되지 않고, 그래서 클라이언트 사이드 효과(localStorage 복원 리다이렉트)를
 * 실제로 동작시켜 확인할 방법이 없다. 검증 못 한 자동 리다이렉트를 넣으면 잘못됐을 때
 * 사용자가 원치 않는 지역에 갇힐 수 있어, 검증 가능한 환경이 생길 때 함께 넣는다.
 * 위치 권한은 어느 경우에도 쓰지 않는다(콘텐츠 확정). */
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
