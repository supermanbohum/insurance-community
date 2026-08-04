import {
  listPlannerMarketCreditPurchases,
  listPlannerMarketCreditBalances,
  listPlannerMarketCreditUnlocks,
} from '@/lib/admin/planner-market-credits';
import { PlannerMarketCreditAdjustDialog } from '@/components/admin/PlannerMarketCreditAdjustDialog';
import { PlannerMarketCreditRefundButton } from '@/components/admin/PlannerMarketCreditRefundButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreditPurchaseTierCode, CreditPurchaseStatus } from '@/types/database';

const TIER_LABEL: Record<CreditPurchaseTierCode, string> = {
  credits_1: '1건',
  credits_10: '10건',
  credits_30: '30건',
  credits_50: '50건',
  credits_100: '100건',
};

const PURCHASE_STATUS_VARIANT: Record<CreditPurchaseStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  paid: 'success',
  refunded: 'outline',
  failed: 'destructive',
};

const PURCHASE_STATUS_LABEL: Record<CreditPurchaseStatus, string> = {
  paid: '결제완료',
  refunded: '환불됨',
  failed: '실패',
};

/** 설계사 마켓 - 열람권 관리. 남은 열람권/구매내역/열람내역을 한 화면에서 관리한다. */
export default async function AdminPlannerMarketCreditsPage() {
  const [balances, purchases, unlocks] = await Promise.all([
    listPlannerMarketCreditBalances(),
    listPlannerMarketCreditPurchases(),
    listPlannerMarketCreditUnlocks(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설계사 마켓 - 열람권 관리</h1>
        <p className="text-sm text-muted-foreground">GA사별 남은 열람권, 구매내역, 열람내역을 확인하고 환불/수동 지급·차감을 처리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GA사별 남은 열람권 ({balances.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {balances.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">보유 열람권이 있는 GA사가 없습니다.</p>
          ) : (
            balances.map((b) => (
              <div key={b.gaCompanyId} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{b.gaCompanyName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.updatedAt).toLocaleString('ko-KR')} 갱신</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{b.balance.toLocaleString()}건</Badge>
                  <PlannerMarketCreditAdjustDialog gaCompanyId={b.gaCompanyId} gaCompanyName={b.gaCompanyName} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">구매내역 ({purchases.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {purchases.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">구매 내역이 없습니다.</p>
          ) : (
            purchases.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.gaCompanyName} · {TIER_LABEL[p.tierCode]} · {p.amountKrw.toLocaleString()}원
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString('ko-KR')}
                    {p.refundReason && ` · 환불사유: ${p.refundReason}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={PURCHASE_STATUS_VARIANT[p.status]}>{PURCHASE_STATUS_LABEL[p.status]}</Badge>
                  {p.status === 'paid' && <PlannerMarketCreditRefundButton purchaseId={p.id} />}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">열람내역 ({unlocks.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {unlocks.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">열람 내역이 없습니다.</p>
          ) : (
            unlocks.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm">
                <p className="font-medium">
                  {u.gaCompanyName} → {u.plannerName}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString('ko-KR')}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
