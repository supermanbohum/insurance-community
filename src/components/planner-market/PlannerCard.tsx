'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { PublicPlannerProfileSummary } from '@/types/database';
import { cn } from '@/lib/utils';
import { PlannerBadgeList } from '@/components/planner-market/PlannerBadgeList';
import { JOB_SEARCH_STATUS_LABEL } from '@/lib/planner-market/labels';

export function PlannerCard({ planner, className }: { planner: PublicPlannerProfileSummary; className?: string }) {
  const href = `/planner-market/${planner.id}`;
  return (
    <Link
      href={href}
      prefetch={false}
      // /planner-market/[plannerId]는 cookies()를 안 읽는 공개 조회 페이지라
      // /planner-market/search와 동일한 이유(해당 파일 주석 참고)로 클라이언트
      // 사이드 이동이 빈 화면을 보여줄 수 있다 - Next 라우터를 완전히 우회한다.
      onClick={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover',
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
        {/* SPEC-021 - 목록에서는 열람 여부와 무관하게 항상 이 플레이스홀더 하나뿐이다(연락처
            열람은 상세 페이지에서만 일어난다). 사진 유무를 구분하지 않는 이유는 §3 참고 -
            구분하면 사진 없는 설계사가 목록에서 식별·불리해진다. */}
        <Image
          src="/images/photo-private-4x3.png"
          alt="사진 비공개 — 열람 시 공개"
          fill
          loading="lazy"
          sizes="(min-width: 1024px) 220px, 45vw"
          className="object-cover"
        />
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
