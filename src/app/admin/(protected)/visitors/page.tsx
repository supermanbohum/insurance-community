import { Footprints } from 'lucide-react';
import { getTodayVisitorBreakdown } from '@/lib/admin/visitors';
import { VisitorAdjustmentForm } from '@/components/admin/VisitorAdjustmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** 방문자수 관리자 보정 - 오늘 하루 단위로 값을 설정한다(자정이 지나면 자동으로
 * 초기화되고 그날의 실제 방문자만 표시된다 - get_today_site_traffic_stats()가 매일
 * site_visit_adjustments에서 "오늘" 날짜의 행만 찾기 때문). */
export default async function AdminVisitorsPage() {
  const breakdown = await getTodayVisitorBreakdown();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">방문자 관리</h1>
        <p className="text-sm text-muted-foreground">오늘 방문자 수에 보정값을 더해 홈페이지에 표시할 최종 숫자를 조정합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4 text-muted-foreground" />
            오늘 방문자
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">실제 방문자</p>
              <p className="text-2xl font-bold tabular-nums">{breakdown.realCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">관리자 보정값</p>
              <p className="text-2xl font-bold tabular-nums">
                {breakdown.adjustment > 0 ? '+' : ''}
                {breakdown.adjustment.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">최종 표시 방문자</p>
              <p className="text-2xl font-bold tabular-nums text-primary">{breakdown.displayCount.toLocaleString()}</p>
            </div>
          </div>

          <VisitorAdjustmentForm currentAdjustment={breakdown.adjustment} />
        </CardContent>
      </Card>
    </div>
  );
}
