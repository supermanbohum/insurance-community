'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';

/**
 * 라우트 세그먼트 error.tsx가 공유하는 화면 - Server Component 데이터 조회가
 * 던지는 에러(DB 순단 등)를 여기서 잡아 "빈 화면"/기본 크래시 화면 대신
 * 이걸 보여준다. reset()은 해당 세그먼트를 다시 렌더링만 시도한다(페이지
 * 전체 새로고침이 아님) - 일시적 오류면 그걸로 충분히 복구된다.
 */
export function ErrorContent({
  error,
  reset,
  homeHref = '/',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[route-error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-extrabold tracking-tight text-ink">일시적인 오류가 발생했습니다</h1>
        <p className="text-sm text-ink-faint">
          잠시 후 다시 시도해주세요.
          <br />
          문제가 계속되면 새로고침해보세요.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          <RotateCw className="h-4 w-4" />
          다시 시도
        </button>
        <Link
          href={homeHref}
          className="flex items-center justify-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-sunken"
        >
          <Home className="h-4 w-4" />
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
