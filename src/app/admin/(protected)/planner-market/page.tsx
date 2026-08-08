import Link from 'next/link';
import { listPlannerMarketProfiles } from '@/lib/admin/planner-market';
import { waitingLabel, isOverdue } from '@/lib/admin/waiting-days';
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

/** 설계사 마켓 - 설계사 등록 승인 큐. TOP설계사(/admin/planners)와는 완전히 별개 화면이다. */
export default async function AdminPlannerMarketPage({ searchParams }: { searchParams: { status?: string } }) {
  const tab = searchParams.status ?? 'pending';
  const all = await listPlannerMarketProfiles();
  // W-086 - 대기열은 오래된 순으로 보여준다(최신순으로 두면 며칠 묵은 신청을 놓친다).
  const items =
    tab === 'pending'
      ? all
          .filter((i) => i.status === 'pending_review' || i.hasTrustUpdatePending)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : all;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">설계사 마켓 - 설계사 등록</h1>
          <p className="text-sm text-muted-foreground">설계사가 신청한 구직 프로필을 검토합니다. 승인해야 &quot;설계사 찾기&quot;에 공개됩니다.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/planner-market/badges" className="text-sm font-medium text-brand-600 hover:underline">
            🏅 배지 심사 →
          </Link>
          <Link href="/admin/planner-market/credits" className="text-sm font-medium text-brand-600 hover:underline">
            열람권 관리 →
          </Link>
        </div>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/planner-market?status=${t.value}`}
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
                href={`/admin/planner-market/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.name} {item.memberUsername ? `(${item.memberUsername})` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.activeRegionLabel || '지역 미상'} · 경력 {item.careerYears}년 · {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    {item.isHidden && ' · 비공개'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.status === 'pending_review' && (
                    <Badge variant={isOverdue(item.createdAt) ? 'destructive' : 'outline'}>{waitingLabel(item.createdAt)}</Badge>
                  )}
                  {item.hasTrustUpdatePending && <Badge variant="warning">변경 요청</Badge>}
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
