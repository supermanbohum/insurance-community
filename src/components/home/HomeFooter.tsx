import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const LINK_GROUPS = [
  {
    label: '서비스',
    links: [
      { href: '/ga', label: 'GA 전체보기' },
      { href: '/region', label: '지역별 GA' },
      { href: '/jobs', label: '채용정보' },
      { href: '/events', label: '이벤트' },
    ],
  },
  {
    label: '파트너',
    links: [
      { href: '/partner/signup', label: 'GA 등록하기' },
      { href: '/partner/login', label: '파트너 로그인' },
    ],
  },
  {
    label: '커뮤니티',
    links: [{ href: '/community', label: '보험인사이드 ↗' }],
  },
];

export function HomeFooter() {
  return (
    <footer className="mt-4 flex flex-col gap-6 border-t border-line pt-6 text-ink-faint">
      <div className="flex flex-wrap gap-x-10 gap-y-5">
        {LINK_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <span className="text-xs font-bold text-ink-soft">{group.label}</span>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-ink-faint transition-colors hover:text-brand-600"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-5 text-[11px] leading-relaxed">
        <span className="flex items-center gap-1 font-bold text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" strokeWidth={2.25} />
          보험맵
        </span>
        <p>전국 보험 GA 검색 플랫폼 · 보험맵</p>
        <p>&copy; {new Date().getFullYear()} 보험맵. All rights reserved.</p>
      </div>
    </footer>
  );
}
