import Link from 'next/link';
import { listPlannerBadges } from '@/lib/admin/planner-badges';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  approved: '승인됨',
  rejected: '반려됨',
};

const TABS = [
  { value: 'pending', label: '심사 대기' },
  { value: 'all', label: '전체' },
];

/** 설계사 마켓 - 배지 신청/부여 큐(연봉 인증 등 self_applicable 배지의 자가신청 + 관리자
 * 수동부여 이력 전체). TOP설계사 인증(/admin/planners)과는 완전히 별개 데이터다. */
export default async function AdminPlannerMarketBadgesPage({ searchParams }: { searchParams: { status?: string } }) {
  const tab = searchParams.status ?? 'pending';
  const all = await listPlannerBadges();
  const items = tab === 'pending' ? all.filter((i) => i.status === 'pending_review') : all;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설계사 마켓 - 배지</h1>
        <p className="text-sm text-muted-foreground">연봉 인증 등 자가신청 배지를 심사합니다. 새 배지 종류가 늘어도 이 화면 하나로 관리됩니다.</p>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/planner-market/badges?status=${t.value}`}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-all',
              tab === t.value ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{items.length}건</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">해당하는 항목이 없습니다.</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={`/admin/planner-market/badges/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.plannerName} · {item.badgeIcon} {item.badgeLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
                <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
