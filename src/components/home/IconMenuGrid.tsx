import Link from 'next/link';
import { MapPin, Building2, Briefcase, Flame, Sparkles, CalendarDays, Users, Megaphone, ExternalLink } from 'lucide-react';

const ITEMS = [
  { href: '/region', label: '지역별', icon: MapPin, tile: 'bg-blue-50 text-blue-600' },
  { href: '/ga', label: 'GA별', icon: Building2, tile: 'bg-indigo-50 text-indigo-600' },
  { href: '/jobs', label: '채용', icon: Briefcase, tile: 'bg-emerald-50 text-emerald-600' },
  { href: '/ga', label: '인기 GA', icon: Flame, tile: 'bg-rose-50 text-rose-600' },
  { href: '/ga', label: '신규 GA', icon: Sparkles, tile: 'bg-amber-50 text-amber-600' },
  { href: '/events', label: '이벤트', icon: CalendarDays, tile: 'bg-violet-50 text-violet-600' },
  { href: '/community', label: '보험인사이드', icon: Users, tile: 'bg-cyan-50 text-cyan-600', external: true },
  { href: '/board/notice', label: '공지사항', icon: Megaphone, tile: 'bg-slate-100 text-slate-600' },
];

export function IconMenuGrid() {
  return (
    <div className="grid grid-cols-4 gap-y-5">
      {ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className="group flex flex-col items-center gap-2"
          >
            <span
              className={`relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95 ${item.tile}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {'external' in item && item.external && (
                <ExternalLink className="absolute right-1.5 top-1.5 h-3 w-3" strokeWidth={2.5} />
              )}
            </span>
            <span className="truncate text-[11px] font-medium text-ink-soft">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
