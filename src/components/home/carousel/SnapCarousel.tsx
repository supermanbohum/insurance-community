'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 한 번에 **한 장씩** 넘기는 캐러셀. 오너 제안(2026-09-04):
 *   「차라리 하나씩 넘기는건 어때. 그러면 화면비율이 커지잖아 보여지는것도.
 *     지금 바뀐 크기에서 3개가 아니라 1개씩 옆으로 넘기게 하자 지점을」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이걸로 바꾸는가 - 두 가지 문제를 한 번에 없앤다
 * ─────────────────────────────────────────────────────────────────────────────
 * ① **사진이 작게 보이던 것.** 카드 폭이 210px 이라 세로로 긴 사진은 높이 상한에 걸려
 *    좌우 여백이 크게 남았다(실측: 사진 122px + 여백 86px). 한 장씩 보이면 카드 폭이
 *    화면 폭에 가까워져 **같은 사진이 훨씬 크게** 들어간다.
 * ② **눌러도 안 들어가지던 것.** 이전 `InfiniteCarousel` 은 rAF 로 **계속 흘렀다.**
 *    움직이는 카드를 누르면 mousedown 과 mouseup 이 서로 다른 카드에서 일어나고
 *    브라우저는 click 을 **공통 조상(트랙)** 에 준다 → `<a>` 가 경로에서 빠져
 *    내비게이션이 아예 일어나지 않는다. **자동 흐름을 없애면 이 문제가 원천적으로 사라진다.**
 *
 * 🔴 그래서 여기에는 자동 재생이 없다. 다시 넣지 마라 - 움직이는 링크는 누를 수 없다.
 *    넘기기는 스와이프(브라우저 기본 가로 스크롤)와 좌우 버튼으로만 한다.
 *
 * 🔴 드래그를 직접 구현하지 않는다. `overflow-x-auto` + `scroll-snap` 이면
 *    브라우저가 관성·스냅·터치를 전부 처리한다. 예전 구현은 pointer 이벤트로 직접
 *    scrollLeft 를 쓰다가 `setPointerCapture` 로 click 을 리타깃시켜 링크를 죽였다.
 *
 * 카드 폭을 90%로 두어 **다음 카드 가장자리가 살짝 보이게** 한다 - 넘길 수 있다는 신호다.
 */
export function SnapCarousel({
  items,
  itemClassName,
}: {
  items: { key: string; node: React.ReactNode }[];
  /** 카드 폭. 기본은 「한 장씩 + 다음 장 살짝」이다. */
  itemClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // 스크롤 위치로 현재 몇 번째인지 센다. 스냅이 끝난 뒤 값이 맞도록 반올림한다.
  const syncIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.getBoundingClientRect().width + 12; // gap-3
    setIndex(Math.min(items.length - 1, Math.max(0, Math.round(track.scrollLeft / step))));
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', syncIndex, { passive: true });
    return () => track.removeEventListener('scroll', syncIndex);
  }, [syncIndex]);

  const go = useCallback((dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.getBoundingClientRect().width + 12;
    track.scrollBy({ left: step * dir, behavior: 'smooth' });
  }, []);

  return (
    <div className="group/carousel relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 scrollbar-hide"
      >
        {items.map((item, i) => (
          <div
            key={item.key}
            className={cn('shrink-0 snap-center', itemClassName ?? 'w-[90%] sm:w-[70%] lg:w-[55%]')}
            style={i < 3 ? { animationDelay: `${i * 60}ms` } : undefined}
          >
            {item.node}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 지점"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="absolute left-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-ink-soft shadow-card transition-opacity hover:bg-white disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="다음 지점"
            onClick={() => go(1)}
            disabled={index >= items.length - 1}
            className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-ink-soft shadow-card transition-opacity hover:bg-white disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* 몇 번째인지 - 점 10개는 세기 어려워 숫자로 둔다. */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ink-faint">
            <span className="tabular-nums">{index + 1}</span>
            <span className="opacity-50">/</span>
            <span className="tabular-nums opacity-70">{items.length}</span>
            <span className="ml-1.5 opacity-60">옆으로 넘겨보세요</span>
          </div>
        </>
      )}
    </div>
  );
}
