'use client';

import { useState, type ReactNode, type PointerEvent } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * 홈 화면 메인 CTA 전용 공용 버튼 - "지점 등록하기"/"설계사 등록하기"가 동일한
 * 컴포넌트를 재사용해 통일된 절제된 프리미엄 톤을 유지한다. 배경 그라디언트와
 * 글로우는 무한 반복 없이 정적이고, "샤인" 스윕만 페이지 진입 시 1회 +
 * hover할 때마다 1회 재생된다(shine 스팬의 key를 바꿔 리마운트시켜 CSS
 * 애니메이션을 매번 처음부터 재생시키는 방식 - 별도 JS 애니메이션 로직 불필요).
 * 색상은 gradientClassName/glowColor로만 갈아끼운다.
 */
export function HeroCtaButton({
  href,
  label,
  icon,
  gradientClassName,
  glowColor,
  textClassName = 'text-white',
}: {
  href: string;
  label: string;
  icon: ReactNode;
  /** 예: 'from-brand-500 via-brand-600 to-brand-800' */
  gradientClassName: string;
  /** 정적 엘리베이션 글로우 색상. 예: 'rgba(37,99,235,0.45)' */
  glowColor: string;
  /** 밝은(골드 등) 그라디언트에서 대비(AA)를 맞출 때만 오버라이드. 기본은 흰색. */
  textClassName?: string;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [shineKey, setShineKey] = useState(0);

  function handlePointerDown(e: PointerEvent<HTMLAnchorElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.3;
    setRipples((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size },
    ]);
  }

  function removeRipple(id: number) {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Link
      href={href}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setShineKey((k) => k + 1)}
      style={{ boxShadow: `0 10px 24px -8px ${glowColor}` }}
      className={cn(
        'group relative flex touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br py-7 transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.96]',
        gradientClassName
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
      {/* 진입 시 1회 + hover마다 1회 재생되는 샤인 스윕 - key가 바뀌면 리마운트되어 애니메이션이 처음부터 다시 실행된다. */}
      <span
        key={shineKey}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
      {ripples.map((r) => (
        <span
          key={r.id}
          onAnimationEnd={() => removeRipple(r.id)}
          className="pointer-events-none absolute rounded-full bg-white/60 animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      <span className={cn('relative', textClassName)}>{icon}</span>
      <span className={cn('relative text-xl font-extrabold tracking-tight', textClassName)}>{label}</span>
    </Link>
  );
}
