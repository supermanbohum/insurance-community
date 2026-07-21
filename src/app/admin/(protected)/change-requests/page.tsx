import Link from 'next/link';
import { listChangeRequests } from '@/lib/change-requests';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '반려됨',
  changes_requested: '수정 요청됨',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  changes_requested: 'outline',
};

export default async function AdminChangeRequestsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status ?? 'pending';
  const items = await listChangeRequests(status === 'all' ? {} : { status: status as 'pending' });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">변경 요청</h1>
        <p className="text-sm text-muted-foreground">파트너가 신청한 GA/지점 정보 수정 요청을 검토합니다.</p>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {[
          { value: 'pending', label: '검토 대기' },
          { value: 'all', label: '전체' },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/change-requests?status=${tab.value}`}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-all',
              status === tab.value ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{items.length}건</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">해당하는 변경 요청이 없습니다.</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={`/admin/change-requests/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.gaCompanyName}
                    {item.targetType === 'ga_branch' && ` · ${item.targetName}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.submittedByName} · 필드 {item.fieldChanges.length}건 · {new Date(item.createdAt).toLocaleDateString('ko-KR')}
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
