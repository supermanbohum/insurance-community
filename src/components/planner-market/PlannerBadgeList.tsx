import type { PlannerBadgeSummary } from '@/types/database';
import { cn } from '@/lib/utils';

/** 배지 여러 개를 한 줄에 나열하는 공용 컴포넌트 - 검색 카드/프로필 상세/내 설계사
 * 관리 등 배지를 보여주는 모든 곳에서 재사용한다. 새 배지 종류가 추가돼도(예: MDRT,
 * Premium 등) planner_badge_types에 행만 추가하면 이 컴포넌트는 코드 변경 없이
 * 그대로 렌더링한다 - 배지 데이터(code/label/icon)를 그대로 받아서 찍어낼 뿐이다. */
export function PlannerBadgeList({ badges, size = 'md', className }: { badges: PlannerBadgeSummary[]; size?: 'sm' | 'md'; className?: string }) {
  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {badges.map((badge) => (
        <span
          key={badge.code}
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-amber-50 font-bold text-amber-700',
            size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
          )}
        >
          <span>{badge.icon}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
