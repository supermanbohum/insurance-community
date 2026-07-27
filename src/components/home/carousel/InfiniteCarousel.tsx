'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "회전초밥처럼" 끊기지 않고 계속 흐르는 캐러셀. 항목을 두 세트로 이어붙이고
 * requestAnimationFrame으로 scrollLeft를 아주 조금씩 증가시키다가, 첫 세트 폭만큼
 * 지나가면 그만큼 되돌려 시작점처럼 보이게 한다(내용이 완전히 동일해 되돌리는
 * 순간이 눈에 보이지 않는다) - 로고 마퀴에 흔히 쓰는 방식.
 *
 * 항목이 minItemsForLoop보다 적으면 억지로 반복시키지 않고 일반 가로 스크롤로 보여준다.
 */
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
  const [paused, setPaused] = useState(false);

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

      if (!paused && !isDraggingRef.current && track && singleSetWidthRef.current > 0) {
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
  }, [loopEnabled, paused, durationSec]);

  const normalizeScroll = useCallback(() => {
    const track = trackRef.current;
    const single = singleSetWidthRef.current;
    if (!track || single <= 0) return;
    if (track.scrollLeft >= single) track.scrollLeft -= single;
    if (track.scrollLeft < 0) track.scrollLeft += single;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    isDraggingRef.current = true;
    draggedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 3) draggedRef.current = true;
    trackRef.current.scrollLeft = dragStartScrollRef.current - dx;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    if (loopEnabled) normalizeScroll();
  }, [loopEnabled, normalizeScroll]);

  /** 드래그 직후 손을 뗀 위치에서 카드(Link)의 클릭 내비게이션이 실수로
   * 발동하지 않도록 막는다 - 실제로 움직였을 때만 클릭을 가로챈다. */
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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClickCapture={handleClickCapture}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
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
