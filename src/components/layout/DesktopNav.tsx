'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SITE_CONFIG } from '@/lib/config/site';

interface Category {
  slug: string;
  name: string;
}

export function DesktopNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  const items = [
    { href: '/', label: '전체' },
    ...categories.map((c) => ({ href: `/board/${c.slug}`, label: c.name })),
    { href: '/best', label: '베스트' },
  ];

  return (
    <header className="sticky top-0 z-30 hidden border-b border-gray-200 bg-white lg:block">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-6">
        <Link href="/" className="whitespace-nowrap text-lg font-bold text-brand-800">
          {SITE_CONFIG.shortName}
        </Link>
        <nav className="flex items-center gap-5">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'text-sm',
                  active ? 'font-semibold text-brand-700' : 'text-gray-600 hover:text-gray-900'
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
        <Link
          href="/write"
          className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          글쓰기
        </Link>
      </div>
    </header>
  );
}
