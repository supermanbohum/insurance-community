import { Badge } from '@/components/ui/badge';
import type { BranchAdProductStatus } from '@/types/database';

const STATUS_VARIANT: Record<BranchAdProductStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  expired: 'outline',
  canceled: 'outline',
};

const STATUS_LABEL: Record<BranchAdProductStatus, string> = {
  pending_review: '심사 대기',
  approved: '노출중',
  rejected: '반려됨',
  expired: '만료됨',
  canceled: '취소됨',
};

export interface AdProductHistoryRow {
  id: string;
  branchName: string;
  productLabel: string;
  startAt: string;
  endAt: string;
  status: BranchAdProductStatus;
  amountKrw: number | null;
}

export function AdProductHistoryTable({ rows }: { rows: AdProductHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-muted-foreground">구매 내역이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-line bg-surface-sunken text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">지점</th>
            <th className="px-4 py-2.5 text-left font-medium">상품</th>
            <th className="px-4 py-2.5 text-left font-medium">기간</th>
            <th className="px-4 py-2.5 text-left font-medium">금액</th>
            <th className="px-4 py-2.5 text-left font-medium">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2.5">{row.branchName}</td>
              <td className="px-4 py-2.5">{row.productLabel}</td>
              <td className="px-4 py-2.5">
                {new Date(row.startAt).toLocaleDateString('ko-KR')} ~ {new Date(row.endAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-4 py-2.5">{row.amountKrw !== null ? `${row.amountKrw.toLocaleString()}원` : '-'}</td>
              <td className="px-4 py-2.5">
                <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
