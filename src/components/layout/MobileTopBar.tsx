'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SITE_CONFIG } from '@/lib/config/site';

interface Category {
  slug: string;
  name: string;
}

export function MobileTopBar({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  const items = [{ href: '/', label: '전체' }, ...categories.map((c) => ({ href: `/board/${c.slug}`, label: c.name })), { href: '/best', label: '베스트' }];

  return (
    <div className="sticky top-0 z-30 border-b border-gray-200 bg-white lg:hidden">
      <div className="flex h-12 items-center px-4">
        <Link href="/" className="text-base font-bold text-brand-800">
          {SITE_CONFIG.shortName}
        </Link>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'shrink-0 whitespace-nowrap pb-1 text-sm',
                active ? 'border-b-2 border-brand-600 font-semibold text-brand-700' : 'text-gray-500'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
