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
 * 컴포넌트를 재사용해 애니메이션(hover scale/gradient pan/glow pulse/클릭
 * ripple/모바일 touch scale)이 항상 통일되게 한다. 색상만 gradientClassName/
 * glowColor로 갈아끼운다 - 새 CTA가 추가돼도 이 컴포넌트만 재사용하면 된다.
 */
export function HeroCtaButton({
  href,
  label,
  icon,
  gradientClassName,
  glowColor,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  /** 예: 'from-brand-500 via-brand-600 to-brand-800' */
  gradientClassName: string;
  /** glow-pulse 키프레임이 읽는 CSS 변수 값. 예: 'rgba(37,99,235,0.45)' */
  glowColor: string;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

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
      style={{ '--glow-color': glowColor } as React.CSSProperties}
      className={cn(
        'group relative flex touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br bg-[length:200%_200%] py-7 shadow-pop transition-transform duration-200 ease-out animate-cta-glow hover:scale-[1.02] active:scale-[0.96]',
        gradientClassName
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
      {ripples.map((r) => (
        <span
          key={r.id}
          onAnimationEnd={() => removeRipple(r.id)}
          className="pointer-events-none absolute rounded-full bg-white/60 animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      <span className="relative text-white">{icon}</span>
      <span className="relative text-xl font-extrabold tracking-tight text-white">{label}</span>
    </Link>
  );
}
