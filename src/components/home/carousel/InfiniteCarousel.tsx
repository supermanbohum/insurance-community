'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "회전초밥처럼" 끊기지 않고 계속 흐르는 캐러셀. 항목을 두 세트로 이어붙이고
 * requestAnimationFrame으로 scrollLeft를 아주 조금씩 증가시키다가, 첫 세트 폭만큼
 * 지나가면 그만큼 되돌려 시작점처럼 보이게 한다(내용이 완전히 동일해 되돌리는
 * 순간이 눈에 보이지 않는다) - 로고 마퀴에 흔히 쓰는 방식.
 *
 * 항목이 minItemsForLoop보다 적으면 억지로 반복시키지 않고 일반 가로 스크롤로 보여준다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 사고 (2026-09-04): 홈에서 지점 카드를 눌러도 상세로 들어가지지 않았다
 * ─────────────────────────────────────────────────────────────────────────────
 * 오너 신고는 「승인한 지점 2건을 홈에서 눌러도 안 들어가진다」였다.
 * 지점 데이터·라우팅은 멀쩡했다 - 직접 URL은 HTTP 200에 제목까지 정상이었고,
 * `a.click()`을 코드로 부르면 언제나 이동했다. **문제는 이 캐러셀이었다.**
 *
 * 실측(2026-09-04, 같은 카드):
 *   커서를 카드 위에 3초 두었다가 클릭  → 이동 성공
 *   커서를 밖에 두었다가 곧바로 클릭     → **이동 실패** (URL 그대로)
 *
 * 원인은 하나가 아니라 넷이었고, 넷 다 클릭을 죽인다.
 *
 * ① **멈추는 데 한 틱이 걸렸다.** 일시정지가 `useState`였다. 포인터가 올라와도
 *    리렌더가 끝나기 전까지 카드가 계속 흐른다. 그 사이에 누르면
 *    mousedown과 mouseup이 **서로 다른 카드**에서 일어나고, 브라우저는 click을
 *    두 지점의 **공통 조상**(=트랙 div)에 디스패치한다. `<a>`가 경로에서 빠지므로
 *    링크 기본 동작이 아예 일어나지 않는다. → 지금은 **ref**로 바꿔 즉시 멈춘다.
 * ② **`setPointerCapture`를 트랙에 걸었다.** 포인터 캡처를 걸면 호환 마우스 이벤트
 *    (mousedown/mouseup/click)까지 캡처 대상으로 **리타깃**된다. 즉 click이 `<a>`가
 *    아니라 트랙 div에서 발생해 내비게이션이 사라진다. 특히 터치에서 치명적이다.
 *    → 제거했다. 드래그 종료는 up/leave/cancel로 충분하다.
 * ③ **드래그 판정이 3px이었다.** 트랙패드·손떨림이면 그냥 누른 것도 "드래그"가 되어
 *    `onClickCapture`가 `preventDefault()`로 클릭을 삼켰다. → 8px로 올리고,
 *    임계값을 넘기 전에는 `scrollLeft`도 건드리지 않는다(누른 순간 화면이 튀지 않게).
 * ④ **`pointercancel`을 처리하지 않았다.** 터치로 브라우저 기본 스크롤이 시작되면
 *    pointercancel이 오는데 받지 않아 `isDragging`이 true로 남고, 그 뒤로
 *    **자동 스크롤이 영구 정지**했다. → 처리했다.
 *
 * ⚠️ 검증 범위: 데스크톱 마우스에서 실패/성공을 실측해 고쳤다.
 *    **터치(실기기)는 검증하지 못했다** - ②④는 코드 근거로 고친 것이다.
 */

/** 이 거리를 넘게 움직여야 "드래그"로 본다. 작으면 그냥 누른 것도 드래그가 된다(③). */
const DRAG_THRESHOLD_PX = 8;

export function InfiniteCarousel({
  items,
  durationSec,
  minItemsForLoop = 6,
  itemClassName,
}: {
  items: { key: string; node: React.ReactNode }[];
  durationSec: number;
  minItemsForLoop?: number;
  itemClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const singleSetWidthRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const draggedRef = useRef(false);
  /** 🔴 상태가 아니라 ref다. 리렌더를 기다리면 그 사이에 카드가 움직여 클릭이 죽는다(①). */
  const pausedRef = useRef(false);

  const loopEnabled = items.length >= minItemsForLoop;
  const displayItems = loopEnabled ? [...items, ...items] : items;

  useEffect(() => {
    if (!loopEnabled) return;
    const track = trackRef.current;
    if (!track) return;
    singleSetWidthRef.current = track.scrollWidth / 2;
  }, [loopEnabled, items.length]);

  useEffect(() => {
    if (!loopEnabled) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const track = trackRef.current;
    if (!track) return;
    let raf: number;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (lastTs == null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;

      if (!pausedRef.current && !isDraggingRef.current && track && singleSetWidthRef.current > 0) {
        const pxPerMs = singleSetWidthRef.current / (durationSec * 1000);
        track.scrollLeft += pxPerMs * dt;
        if (track.scrollLeft >= singleSetWidthRef.current) {
          track.scrollLeft -= singleSetWidthRef.current;
        }
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loopEnabled, durationSec]);

  const normalizeScroll = useCallback(() => {
    const track = trackRef.current;
    const single = singleSetWidthRef.current;
    if (!track || single <= 0) return;
    if (track.scrollLeft >= single) track.scrollLeft -= single;
    if (track.scrollLeft < 0) track.scrollLeft += single;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // 🔴 무엇을 누르든 **먼저 멈춘다.** 누르는 대상이 움직이면 클릭이 성립하지 않는다(①).
    pausedRef.current = true;

    // 터치는 브라우저의 기본 가로 스크롤에 맡긴다. 직접 scrollLeft를 쓰면
    // 기본 스크롤과 겹쳐 튀고, 탭 판정도 흔들린다.
    if (e.pointerType === 'touch') return;

    const track = trackRef.current;
    if (!track) return;
    isDraggingRef.current = true;
    draggedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = track.scrollLeft;

    // 🔴 setPointerCapture를 부르지 않는다. 캡처를 걸면 click이 `<a>`가 아니라
    //    이 트랙으로 리타깃되어 링크가 죽는다(②). 종료는 up/leave/cancel로 충분하다.
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (!draggedRef.current) {
      if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return; // 아직 클릭일 수 있다 - 화면을 건드리지 않는다
      draggedRef.current = true;
    }
    trackRef.current.scrollLeft = dragStartScrollRef.current - dx;
  }, []);

  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (loopEnabled) normalizeScroll();
  }, [loopEnabled, normalizeScroll]);

  /** 드래그 직후 손을 뗀 위치에서 카드(Link)의 클릭 내비게이션이 실수로
   * 발동하지 않도록 막는다 - **실제로 8px 넘게 움직였을 때만** 클릭을 가로챈다. */
  const handleClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  }, []);

  function scrollByPage(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: track.clientWidth * 0.85 * dir, behavior: 'smooth' });
  }

  if (!loopEnabled) {
    return (
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {items.map((item, i) => (
          <div
            key={item.key}
            className={cn('stagger-item shrink-0', itemClassName)}
            style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
          >
            {item.node}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="group/carousel relative -mx-4 px-4"
      // 포인터가 영역에 들어오면 즉시 멈춘다. 마우스가 카드에 닿는 순간부터
      // 표적이 정지해 있어야 누르는 대로 눌린다.
      onPointerEnter={() => {
        pausedRef.current = true;
      }}
      onPointerLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        onTouchStart={() => {
          pausedRef.current = true;
        }}
        onTouchEnd={() => {
          pausedRef.current = false;
        }}
        onTouchCancel={() => {
          pausedRef.current = false;
        }}
        className="flex cursor-grab gap-3 overflow-x-auto pb-1 scrollbar-hide active:cursor-grabbing"
      >
        {displayItems.map((item, i) => (
          <div
            key={`${item.key}-${i}`}
            className={cn('shrink-0', i < items.length && 'stagger-item', itemClassName)}
            style={i < items.length ? { animationDelay: `${Math.min(i, 6) * 60}ms` } : undefined}
          >
            {item.node}
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="이전"
        onClick={() => scrollByPage(-1)}
        className="absolute left-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-1.5 text-ink-soft opacity-0 shadow-card transition-opacity hover:bg-white group-hover/carousel:opacity-100 sm:flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="다음"
        onClick={() => scrollByPage(1)}
        className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-1.5 text-ink-soft opacity-0 shadow-card transition-opacity hover:bg-white group-hover/carousel:opacity-100 sm:flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
