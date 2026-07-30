'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'boheommap:brand_intro_played_v1';

// BrandMark.tsx와 동일한 대한민국 지도 실루엣 path - 헤더의 실제 로고(검색창 옆)에
// 직접 애니메이션을 걸어야 해서 지도/제주도 그룹을 따로 나눠 그린다(BrandMark는 정적 전용).
const KOREA_PATH =
  'M62 4 C72 4 79 10 79 19 C79 27 74 31 67 37 C78 41 82 52 79 64 C76 76 68 88 60 96 C53 103 48 108 46 116 C42 106 38 100 34 94 C26 84 21 74 25 62 C20 58 17 50 20 42 C17 34 20 26 28 22 C34 19 38 24 44 24 C46 16 52 8 62 4 Z';

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
        <svg viewBox="0 0 100 130" fill="currentColor" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <g
            className={cn(playing && 'animate-brand-shield')}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <path d={KOREA_PATH} />
          </g>
          <g className={cn(playing && 'animate-brand-people')}>
            <ellipse cx="50" cy="122" rx="7" ry="4" />
          </g>
        </svg>
      </span>
      <span className={cn('text-lg font-extrabold tracking-tight text-ink', playing && 'animate-brand-text')}>보험맵</span>
    </>
  );
}
