import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BadgeCheck, MapPin, Eye, Building2, RefreshCw } from 'lucide-react';
import type { PublicBranchSummary } from '@/types/database';
import { avatarGradient, cn } from '@/lib/utils';
import { HighlightText } from '@/components/search/HighlightText';

const RANK_STYLE: Record<number, string> = {
  1: 'bg-gradient-to-br from-amber-300 to-gold-500',
  2: 'bg-gradient-to-br from-slate-300 to-slate-400',
  3: 'bg-gradient-to-br from-orange-300 to-orange-500',
};

export function BranchCard({
  branch,
  rank,
  className,
  highlightQuery,
  showMeta,
}: {
  branch: PublicBranchSummary;
  rank?: number;
  className?: string;
  highlightQuery?: string;
  /** 지점 수 / 최근 업데이트 정보를 추가로 표시한다 (홈 "인기 GA" 슬라이드 등 여백이 있는 곳에서만 사용). */
  showMeta?: boolean;
}) {
  return (
    <Link
      href={`/branch/${branch.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover',
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
        {branch.mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branch.mainImageUrl}
            alt={branch.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85',
              avatarGradient(branch.gaCompanyName + branch.name)
            )}
          >
            <Building2 className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}

        {rank !== undefined && (
          <span
            className={cn(
              'absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-pop ring-2 ring-white/80',
              RANK_STYLE[rank] ?? 'bg-ink/70 backdrop-blur'
            )}
          >
            {rank}
          </span>
        )}

        {branch.isRecommended && (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-brand-600 shadow-sm backdrop-blur">
            추천
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="flex items-center gap-1 truncate text-[11px] font-medium text-ink-faint">
          {branch.isGaVerified && <BadgeCheck className="h-3 w-3 shrink-0 text-brand-500" />}
          <span className="truncate">{branch.gaCompanyName}</span>
        </p>
        <p className="truncate text-[15px] font-bold leading-tight text-ink">
          <HighlightText text={branch.name} query={highlightQuery} />
        </p>
        <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
          <span className="flex min-w-0 items-center gap-1 truncate rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{branch.sidoName ? `${branch.sidoName} ${branch.sigunguName ?? ''}` : branch.address}</span>
          </span>
          <p className="flex shrink-0 items-center gap-0.5 text-[11px] text-ink-faint">
            <Eye className="h-3 w-3" />
            {branch.viewCount.toLocaleString('ko-KR')}
          </p>
        </div>

        {showMeta && (
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              전국 {branch.gaBranchCount}개 지점
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {formatDistanceToNow(new Date(branch.updatedAt), { addSuffix: true, locale: ko })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
