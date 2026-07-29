'use client';

import { useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'boheommap:brand_intro_played_v1';

// BrandMark.tsx와 동일한 방패+3인 실루엣 - 여기서는 지도 마커와 같은 핀(32x40, NaverMapView
// pinIconHtml과 동일 공식) 위에 얹어 "브랜드 히어로" 버전으로 크게 재사용한다.
const PIN_PATH = 'M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0z';
const SHIELD_PATH =
  'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z';

/**
 * 홈 화면 전용 브랜드 인트로 애니메이션 - 헤더 로고는 절대 애니메이션되지 않고 항상
 * 고정이며, 이 컴포넌트만 세션당(sessionStorage) 딱 한 번, 최초 진입 시에만 재생된다.
 * useLayoutEffect로 첫 페인트 전에 애니메이션 클래스를 확정지어 "다 보였다가 순간
 * 사라졌다 다시 나타나는" 깜빡임 없이 바로 시작 상태(투명/축소)에서 그려지게 한다.
 * prefers-reduced-motion이거나 sessionStorage 접근이 막힌 환경(시크릿 모드 등)에서는
 * 애니메이션 없이 최종 상태로만 보인다.
 */
export function BrandIntro() {
  const [playing, setPlaying] = useState(false);

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
      sessionStorage.setItem(STORAGE_KEY, '1');
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setPlaying(true);
    } catch {
      // sessionStorage 접근 불가 - 애니메이션 없이 최종 상태로 노출.
    }
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 40" className="h-9 w-[28.8px] shrink-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brand-intro-pin-gradient" x1="0" y1="0" x2="32" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f6bff" />
            <stop offset="1" stopColor="#152d70" />
          </linearGradient>
        </defs>
        <g
          className={cn(playing && 'animate-brand-pin')}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <path d={PIN_PATH} fill="url(#brand-intro-pin-gradient)" />
          <circle cx="16" cy="16" r="10.5" fill="#ffffff" />
        </g>
        <g transform="translate(4,5)">
          <g
            className={cn(playing && 'animate-brand-shield')}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <path
              d={SHIELD_PATH}
              fill="none"
              stroke="#152d70"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g className={cn(playing && 'animate-brand-people')} fill="#152d70">
            <ellipse cx="8.1" cy="15" rx="2.5" ry="2.2" />
            <circle cx="8.1" cy="10.15" r="1.4" />
            <ellipse cx="15.9" cy="15" rx="2.5" ry="2.2" />
            <circle cx="15.9" cy="10.15" r="1.4" />
            <ellipse cx="12" cy="15.4" rx="3.6" ry="3" />
            <circle cx="12" cy="8.75" r="1.85" />
          </g>
        </g>
      </svg>
      <span className={cn('text-xl font-extrabold tracking-tight text-ink', playing && 'animate-brand-text')}>
        보험맵
      </span>
    </div>
  );
}
