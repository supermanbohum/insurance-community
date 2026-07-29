'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'boheommap:brand_intro_played_v1';

// BrandMark.tsx와 동일한 방패+3인 실루엣 path - 헤더의 실제 로고(검색창 옆)에 직접
// 애니메이션을 걸어야 해서 방패/사람 그룹을 따로 나눠 그린다(BrandMark는 정적 전용).
const SHIELD_PATH =
  'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z';

/**
 * 헤더(검색창 옆) 로고 전용 - 메인 페이지("/")에 최초 진입할 때만 세션당 1회
 * 재생되는 브랜드 인트로 애니메이션을 이 자리에서 직접 재생한다(별도 위치에 로고를
 * 새로 만들지 않는다). 다른 페이지에서는, 그리고 이미 재생한 뒤에는 평소와 동일한
 * 정적 로고로 보인다. 드로어 메뉴 안의 로고는 이 컴포넌트를 쓰지 않고 계속 정적이다.
 */
export function AnimatedHeaderBrandMark() {
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);

  useLayoutEffect(() => {
    if (pathname !== '/') return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
      sessionStorage.setItem(STORAGE_KEY, '1');
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setPlaying(true);
    } catch {
      // sessionStorage 접근 불가 - 애니메이션 없이 최종 상태로 노출.
    }
  }, [pathname]);

  return (
    <>
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm',
          playing && 'animate-brand-pin'
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <g
            className={cn(playing && 'animate-brand-shield')}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <path d={SHIELD_PATH} stroke="currentColor" strokeWidth={1.62} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className={cn(playing && 'animate-brand-people')} fill="currentColor">
            <ellipse cx="8.1" cy="15" rx="2.5" ry="2.2" />
            <circle cx="8.1" cy="10.15" r="1.4" />
            <ellipse cx="15.9" cy="15" rx="2.5" ry="2.2" />
            <circle cx="15.9" cy="10.15" r="1.4" />
            <ellipse cx="12" cy="15.4" rx="3.6" ry="3" />
            <circle cx="12" cy="8.75" r="1.85" />
          </g>
        </svg>
      </span>
      <span className={cn('text-lg font-extrabold tracking-tight text-ink', playing && 'animate-brand-text')}>보험맵</span>
    </>
  );
}
