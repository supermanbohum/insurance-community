'use client';

import { useEffect, useState } from 'react';

/** 절제된 count-up - ease-out 곡선으로 0.9초 안에 목표값에 도달한다.
 * prefers-reduced-motion이면 애니메이션 없이 바로 목표값을 보여준다. */
export function StatCountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    let raf: number;
    let start: number | null = null;

    function step(ts: number) {
      if (start == null) start = ts;
      const progress = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <>{display.toLocaleString('ko-KR')}</>;
}
