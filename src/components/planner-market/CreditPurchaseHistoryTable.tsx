import { Badge } from '@/components/ui/badge';
import type { CreditPurchaseTierCode, CreditPurchaseStatus } from '@/types/database';

const TIER_LABEL: Record<CreditPurchaseTierCode, string> = {
  credits_1: '1건',
  credits_10: '10건',
  credits_30: '30건',
  credits_50: '50건',
  credits_100: '100건',
};

const STATUS_VARIANT: Record<CreditPurchaseStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  paid: 'success',
  refunded: 'outline',
  failed: 'destructive',
};

const STATUS_LABEL: Record<CreditPurchaseStatus, string> = {
  paid: '구매완료',
  refunded: '환불됨',
  failed: '실패',
};

export interface CreditPurchaseHistoryRow {
  id: string;
  tierCode: CreditPurchaseTierCode;
  creditCount: number;
  amountKrw: number;
  status: CreditPurchaseStatus;
  createdAt: string;
}

/** 구매내역 표 - GA 파트너 자신의 구매내역(/planner-market/purchase, /planner-market/history)에서 재사용. */
export function CreditPurchaseHistoryTable({ rows }: { rows: CreditPurchaseHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-muted-foreground">구매 내역이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="border-b border-line bg-surface-sunken text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">구매일</th>
            <th className="px-4 py-2.5 text-left font-medium">상품</th>
            <th className="px-4 py-2.5 text-left font-medium">금액</th>
            <th className="px-4 py-2.5 text-left font-medium">지급 열람권</th>
            <th className="px-4 py-2.5 text-left font-medium">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2.5">{new Date(row.createdAt).toLocaleDateString('ko-KR')}</td>
              <td className="px-4 py-2.5">{TIER_LABEL[row.tierCode]}</td>
              <td className="px-4 py-2.5">{row.amountKrw.toLocaleString()}원</td>
              <td className="px-4 py-2.5">{row.creditCount.toLocaleString()}건</td>
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
