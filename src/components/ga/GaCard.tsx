import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import type { PublicGaListItem } from '@/lib/public/ga';
import { avatarGradient, cn } from '@/lib/utils';

export function GaCard({ ga, className }: { ga: PublicGaListItem; className?: string }) {
  return (
    <Link
      href={`/ga/${ga.slug}`}
      className={cn(
        'group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface-card p-4 text-center shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover',
        className
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken ring-4 ring-white transition-transform duration-300 group-hover:scale-105">
        {ga.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ga.logoUrl} alt={ga.name} className="h-full w-full object-cover" />
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br text-base font-extrabold text-white/90',
              avatarGradient(ga.name)
            )}
          >
            {ga.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[13px] font-bold text-ink">{ga.name}</span>
          {ga.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
        </span>
        {ga.ceoName && <span className="truncate text-[11px] text-ink-faint">대표 {ga.ceoName}</span>}
      </div>
      <span className="mt-auto rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
        지점 {ga.branchCount}곳
      </span>
    </Link>
  );
}
