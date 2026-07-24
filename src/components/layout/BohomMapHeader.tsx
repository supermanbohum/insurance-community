'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X, MapPin, Building2, Briefcase, Flame, Sparkles, CalendarDays, Users, Megaphone, ShieldCheck, ExternalLink } from 'lucide-react';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

const MENU_GROUPS = [
  {
    label: '자주 찾는 메뉴',
    items: [
      { href: '/region', label: '지역별', icon: MapPin, tile: 'bg-blue-50 text-blue-600' },
      { href: '/ga', label: 'GA별', icon: Building2, tile: 'bg-indigo-50 text-indigo-600' },
      { href: '/ga', label: '인기 GA', icon: Flame, tile: 'bg-rose-50 text-rose-600' },
      { href: '/ga', label: '신규 GA', icon: Sparkles, tile: 'bg-amber-50 text-amber-600' },
    ],
  },
  {
    label: '채용 · 이벤트',
    items: [
      { href: '/jobs', label: '채용', icon: Briefcase, tile: 'bg-emerald-50 text-emerald-600' },
      { href: '/events', label: '이벤트', icon: CalendarDays, tile: 'bg-violet-50 text-violet-600' },
    ],
  },
  {
    label: '커뮤니티',
    items: [
      { href: '/community', label: '보험인사이드', icon: Users, tile: 'bg-cyan-50 text-cyan-600', external: true },
      { href: '/board/notice', label: '공지사항', icon: Megaphone, tile: 'bg-slate-100 text-slate-600' },
    ],
  },
];

export function BohomMapHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 shadow-header backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-surface-sunken active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">보험맵</span>
          </Link>
          <div className="relative ml-1 flex-1">
            <SearchCombobox
              placeholder="지역, GA명, 지점명 검색"
              iconClassName="left-3.5"
              inputClassName="w-full rounded-full border border-transparent bg-surface-sunken py-2.5 pl-9 pr-3 text-base text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:shadow-card"
              navigateOnFocus
            />
          </div>
          {user ? (
            <Link
              href="/my"
              aria-label="마이페이지"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-xs font-bold text-brand-600"
            >
              {user.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImage} alt={user.nickname} className="h-full w-full object-cover" />
              ) : (
                user.nickname.slice(0, 1)
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className={cn(
                'shrink-0 rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken'
              )}
            >
              로그인
            </Link>
          )}
        </div>
      </header>

      {menuOpen &&
        createPortal(
          <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="메뉴 닫기"
              className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col overflow-y-auto bg-white p-5 shadow-2xl duration-300 animate-in slide-in-from-left">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <span className="text-base font-extrabold text-ink">보험맵</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-sunken"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-6">
                {MENU_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{group.label}</p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tile}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {item.label}
                          {'external' in item && item.external && <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
