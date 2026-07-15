import Link from 'next/link';
import clsx from 'clsx';

interface PaginationProps {
  basePath: string;
  currentPage: number;
  totalPages: number;
}

function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function Pagination({ basePath, currentPage, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="mt-6 flex items-center justify-center gap-1 text-sm">
      {currentPage > 1 && (
        <Link href={pageHref(basePath, currentPage - 1)} className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100">
          이전
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={pageHref(basePath, page)}
          className={clsx(
            'rounded px-3 py-1',
            page === currentPage ? 'bg-brand-600 font-semibold text-white' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          {page}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link href={pageHref(basePath, currentPage + 1)} className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100">
          다음
        </Link>
      )}
    </nav>
  );
}
