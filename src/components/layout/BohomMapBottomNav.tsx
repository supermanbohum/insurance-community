'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Briefcase, Users, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: '홈', icon: Home, exact: true },
  { href: '/search', label: '검색', icon: Search },
  { href: '/jobs', label: '채용', icon: Briefcase },
  { href: '/community', label: '커뮤니티', icon: Users },
  { href: '/my/posts', label: '마이페이지', icon: UserRound },
] as const;

export function BohomMapBottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-md lg:hidden">
      {TABS.map((tab) => {
        const active = 'exact' in tab && tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] transition-colors"
          >
            <span
              className={cn(
                'flex h-7 w-11 items-center justify-center rounded-full transition-all duration-200',
                active ? 'bg-brand-50 text-brand-600' : 'text-ink-faint'
              )}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className={cn('transition-colors', active ? 'font-bold text-brand-600' : 'font-medium text-ink-faint')}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
