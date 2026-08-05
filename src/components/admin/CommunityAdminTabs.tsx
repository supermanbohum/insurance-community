import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin/community', label: '게시글' },
  { href: '/admin/community/comments', label: '댓글 관리' },
  { href: '/admin/community/reports', label: '신고 관리' },
];

export function CommunityAdminTabs({ active }: { active: 'posts' | 'comments' | 'reports' }) {
  const activeHref = active === 'posts' ? '/admin/community' : active === 'comments' ? '/admin/community/comments' : '/admin/community/reports';
  return (
    <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab.href === activeHref ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
