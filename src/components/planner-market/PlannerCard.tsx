import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import type { PublicPlannerProfileSummary } from '@/types/database';
import { avatarGradient, cn } from '@/lib/utils';
import { PlannerBadgeList } from '@/components/planner-market/PlannerBadgeList';
import { JOB_SEARCH_STATUS_LABEL } from '@/lib/planner-market/labels';

export function PlannerCard({ planner, className }: { planner: PublicPlannerProfileSummary; className?: string }) {
  return (
    <Link
      href={`/planner-market/${planner.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover',
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
        {planner.profilePhotoUrl ? (
          <Image
            src={planner.profilePhotoUrl}
            alt="설계사 프로필 사진"
            fill
            loading="lazy"
            sizes="(min-width: 1024px) 220px, 45vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85', avatarGradient(planner.id))}>
            <User className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
        {planner.badges.length > 0 && (
          <PlannerBadgeList badges={planner.badges} size="sm" className="absolute left-2 top-2" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-sm font-semibold text-ink">{planner.activeRegionLabel || '지역 미상'} · 경력 {planner.careerYears}년</p>
        {planner.specialties.length > 0 && (
          <p className="truncate text-xs text-ink-soft">{planner.specialties.join(', ')}</p>
        )}
        {planner.selfIntroduction && <p className="line-clamp-2 text-xs text-ink-faint">{planner.selfIntroduction}</p>}
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {planner.jobSearchStatus !== 'not_looking' && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              {JOB_SEARCH_STATUS_LABEL[planner.jobSearchStatus]}
            </span>
          )}
          {planner.desiredRegionLabel && (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-soft">희망 {planner.desiredRegionLabel}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
