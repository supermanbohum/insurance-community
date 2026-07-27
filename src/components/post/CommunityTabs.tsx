import Link from 'next/link';
import { cn } from '@/lib/utils';

export function CommunityTabs({
  categories,
  activeSlug,
}: {
  categories: { slug: string; name: string }[];
  activeSlug?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href="/community"
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
          !activeSlug ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-soft hover:bg-brand-50 hover:text-brand-600'
        )}
      >
        전체
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/board/${c.slug}`}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
            activeSlug === c.slug ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-soft hover:bg-brand-50 hover:text-brand-600'
          )}
        >
          {c.name}
        </Link>
      ))}
      <Link
        href="/best"
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
          activeSlug === 'best' ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-soft hover:bg-brand-50 hover:text-brand-600'
        )}
      >
        베스트
      </Link>
    </div>
  );
}
