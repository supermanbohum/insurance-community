import { Eye, TrendingUp, Unlock } from 'lucide-react';

export interface PlannerProfileStats {
  totalViews: number;
  viewsLast7Days: number;
  contactUnlockCount: number;
}

/** 내 프로필이 얼마나 노출되는지 보여준다 - 등록 유지율을 높이기 위한 최소 지표 3종.
 * "관심등록 수"는 사용자가 명시적으로 추후 항목으로 미뤄서 아직 없다. */
export function PlannerProfileStatsCard({ stats }: { stats: PlannerProfileStats }) {
  const items = [
    { icon: Eye, label: '총 조회수', value: stats.totalViews },
    { icon: TrendingUp, label: '최근 7일 조회수', value: stats.viewsLast7Days },
    { icon: Unlock, label: '연락처 열람 횟수', value: stats.contactUnlockCount },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-white p-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-1 text-center">
          <item.icon className="h-4 w-4 text-brand-500" />
          <p className="text-lg font-extrabold text-ink">{item.value.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
