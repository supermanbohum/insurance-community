'use client';

import { usePathname } from 'next/navigation';

/**
 * 라우트 전환마다 살짝 페이드+슬라이드업 되도록 한다. 새 라이브러리 없이
 * key를 pathname으로 줘서 매 전환마다 CSS 애니메이션이 다시 트리거되게 하는 방식.
 * prefers-reduced-motion 사용자는 globals.css에서 애니메이션을 꺼둔다.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-fade">
      {children}
    </div>
  );
}
