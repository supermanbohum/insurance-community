import Link from 'next/link';
import { listBranchAdProducts } from '@/lib/admin/ad-products';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  expired: 'outline',
  canceled: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  approved: '승인됨',
  rejected: '반려됨',
  expired: '만료됨',
  canceled: '취소됨',
};

const TABS = [
  { value: 'pending', label: '심사 대기' },
  { value: 'all', label: '전체' },
];

/** 지점 광고 상품 승인 큐 - 설계사 마켓과 완전히 독립된 두 번째 수익 스트림. */
export default async function AdminAdProductsPage({ searchParams }: { searchParams: { status?: string } }) {
  const tab = searchParams.status ?? 'pending';
  const all = await listBranchAdProducts();
  const items = tab === 'pending' ? all.filter((i) => i.status === 'pending_review') : all;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">광고 관리</h1>
        <p className="text-sm text-muted-foreground">GA가 구매한 지점 광고 상품을 검토합니다. 승인 즉시 지점 노출에 반영됩니다.</p>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/ad-products?status=${t.value}`}
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
                href={`/admin/ad-products/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.branchName} · {item.productLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.gaCompanyName} · {new Date(item.startAt).toLocaleDateString('ko-KR')} ~ {new Date(item.endAt).toLocaleDateString('ko-KR')}
                    {item.amountKrw !== null && ` · ${item.amountKrw.toLocaleString()}원`}
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
