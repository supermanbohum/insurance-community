'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const ITEMS = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/best', label: '베스트', icon: '🔥' },
  { href: '/write', label: '글쓰기', icon: '✏️' },
  { href: '/search', label: '검색', icon: '🔍' },
  { href: '/my/posts', label: '내 활동', icon: '👤' },
];

export function MobileNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-gray-200 bg-white lg:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              active ? 'text-brand-600 font-semibold' : 'text-gray-500'
            )}
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
