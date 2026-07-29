import Link from 'next/link';
import { listPlannerCertifications } from '@/lib/admin/planners';
import { INCOME_TIER_SHORT_LABEL, PLANNER_STATUS_LABEL } from '@/lib/planners/tier';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  pending_renewal: 'warning',
  rejected: 'destructive',
  expiring_soon: 'warning',
  expired: 'destructive',
  approved: 'success',
};

const TABS = [
  { value: 'pending', label: '심사 대기' },
  { value: 'all', label: '전체' },
];

export default async function AdminPlannersPage({ searchParams }: { searchParams: { status?: string } }) {
  const tab = searchParams.status ?? 'pending';
  const all = await listPlannerCertifications();
  const items = tab === 'pending' ? all.filter((i) => i.status === 'pending_review' || i.status === 'pending_renewal') : all;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">고소득 설계사</h1>
        <p className="text-sm text-muted-foreground">파트너가 신청한 고소득 설계사 인증을 검토합니다.</p>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/planners?status=${t.value}`}
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
                href={`/admin/planners/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.plannerName} · {item.gaCompanyName} {item.branchName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {INCOME_TIER_SHORT_LABEL[item.incomeTier]} · {item.jobTitle} · {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[item.displayStatus]}>{PLANNER_STATUS_LABEL[item.displayStatus]}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
