'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SITE_CONFIG } from '@/lib/config/site';

const ITEMS = [
  { href: '/', label: '전체' },
  { href: '/board/issue', label: '보험이슈' },
  { href: '/board/free', label: '자유게시판' },
  { href: '/best', label: '베스트' },
];

export function DesktopNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="hidden border-b border-gray-200 bg-white lg:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Link href="/" className="text-lg font-bold text-brand-600">
          {SITE_CONFIG.shortName}
        </Link>
        <nav className="flex items-center gap-6">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'text-sm',
                  active ? 'font-semibold text-brand-600' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action="/search" className="ml-auto flex-1 max-w-xs">
          <input
            name="q"
            type="search"
            placeholder="검색어를 입력하세요"
            className="w-full rounded-full border border-gray-300 px-4 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </form>
      </div>
    </header>
  );
}
