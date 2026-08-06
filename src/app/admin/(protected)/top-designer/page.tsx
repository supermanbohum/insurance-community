import Link from 'next/link';
import { listTopDesignerCertifications } from '@/lib/admin/top-designer';
import { STAR_TIER_LABEL } from '@/lib/top-designer/labels';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  on_hold: 'secondary',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  on_hold: '보류',
  approved: '승인됨',
  rejected: '반려됨',
};

const TABS = [
  { value: 'pending_review', label: '심사 대기' },
  { value: 'on_hold', label: '보류' },
  { value: 'all', label: '전체' },
];

export default async function AdminTopDesignerPage({ searchParams }: { searchParams: { status?: string } }) {
  const tab = searchParams.status ?? 'pending_review';
  const items =
    tab === 'all'
      ? await listTopDesignerCertifications()
      : await listTopDesignerCertifications({ status: tab as 'pending_review' | 'on_hold' | 'approved' | 'rejected' });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">TOP 설계사 인증</h1>
        <p className="text-sm text-muted-foreground">신청된 원천징수영수증을 확인하고 별등급을 부여합니다.</p>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/top-designer?status=${t.value}`}
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
                href={`/admin/top-designer/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.plannerName} · {item.jobTitle}
                    {item.starTier && <span className="ml-1.5 text-amber-600">{STAR_TIER_LABEL[item.starTier]}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    신고 연봉 {item.declaredAnnualIncomeKrw ? `${item.declaredAnnualIncomeKrw.toLocaleString()}원` : '-'} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </p>
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
