'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/** 뒤로가기 버튼 - 브라우저 히스토리가 있으면 그 자리에서 뒤로가고, 없으면(새 탭으로
 * 바로 들어온 경우 등) 홈으로 이동한다. 모바일/PC 동일하게 동작한다. */
export function BackButton({ fallbackHref = '/' }: { fallbackHref?: string }) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-fit items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-sunken"
    >
      <ChevronLeft className="h-4 w-4" />
      뒤로가기
    </button>
  );
}
