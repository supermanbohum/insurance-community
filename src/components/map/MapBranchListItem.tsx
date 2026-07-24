import Image from 'next/image';
import { BadgeCheck, Briefcase, Building2, Eye, MapPin } from 'lucide-react';
import { avatarGradient, cn } from '@/lib/utils';
import type { MapBranch } from './types';

export function MapBranchListItem({
  branch,
  active,
  onClick,
}: {
  branch: MapBranch;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
        active ? 'border-brand-300 bg-brand-50/60' : 'border-line bg-white hover:border-brand-200 hover:bg-surface-sunken'
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
        {branch.mainImageUrl ? (
          <Image src={branch.mainImageUrl} alt={branch.name} fill loading="lazy" sizes="56px" className="object-cover" />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85',
              avatarGradient(branch.gaCompanyName + branch.name)
            )}
          >
            <Building2 className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[11px] font-medium text-ink-faint">
          {branch.isGaVerified && <BadgeCheck className="h-3 w-3 shrink-0 text-brand-500" />}
          <span className="truncate">{branch.gaCompanyName}</span>
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              branch.operationType === 'direct' ? 'bg-gold-50 text-gold-600' : 'bg-surface-sunken text-ink-soft'
            )}
          >
            {branch.operationType === 'direct' ? '직영' : '지사'}
          </span>
        </p>
        <p className="truncate text-sm font-bold text-ink">{branch.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-faint">
          <span className="flex min-w-0 items-center gap-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{branch.sidoName ? `${branch.sidoName} ${branch.sigunguName ?? ''}` : branch.address}</span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {branch.viewCount.toLocaleString('ko-KR')}
          </span>
          {branch.hasActiveRecruit && (
            <span className="flex shrink-0 items-center gap-0.5 font-semibold text-brand-600">
              <Briefcase className="h-3 w-3" />
              채용중
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
