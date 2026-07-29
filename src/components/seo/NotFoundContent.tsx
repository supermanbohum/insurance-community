import Link from 'next/link';
import { SearchX, Home, Search } from 'lucide-react';

export function NotFoundContent() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
        <SearchX className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-extrabold tracking-tight text-ink">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-ink-faint">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
          <br />
          아래에서 다시 찾아보세요.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          <Home className="h-4 w-4" />
          홈으로 이동
        </Link>
        <Link
          href="/search"
          className="flex items-center justify-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-sunken"
        >
          <Search className="h-4 w-4" />
          지점 검색하기
        </Link>
      </div>
    </div>
  );
}
