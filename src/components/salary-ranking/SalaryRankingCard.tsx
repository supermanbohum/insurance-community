'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User, Eye } from 'lucide-react';
import type { PublicSalaryRankingCardSummary } from '@/lib/public/salary-ranking.supabase';
import { avatarGradient, cn } from '@/lib/utils';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function SalaryRankingCard({ submission, rank, className }: { submission: PublicSalaryRankingCardSummary; rank?: number; className?: string }) {
  const href = `/salary-ranking/detail/${submission.id}`;
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-line bg-surface-card p-3 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-card-hover',
        className
      )}
    >
      {rank && (
        <span className="flex w-9 shrink-0 items-center justify-center text-lg font-extrabold text-ink-faint">
          {MEDAL[rank] ?? rank}
        </span>
      )}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
        {submission.profilePhotoUrl ? (
          <Image src={submission.profilePhotoUrl} alt={submission.displayName} fill sizes="48px" className="object-cover" />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85', avatarGradient(submission.id))}>
            <User className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-bold text-ink">{submission.displayName}</p>
        <p className="truncate text-xs text-ink-soft">
          {submission.jobTitle} · {submission.activeRegionLabel || '지역 미상'}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="text-base font-extrabold text-rose-600">{(submission.annualIncomeKrw / 100_000_000).toLocaleString()}억원</p>
        <span className="flex items-center gap-0.5 text-[11px] text-ink-faint">
          <Eye className="h-3 w-3" /> {submission.viewCount}
        </span>
      </div>
    </Link>
  );
}
