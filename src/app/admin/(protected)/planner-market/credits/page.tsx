import {
  listPlannerMarketCreditPurchases,
  listPlannerMarketCreditBalances,
  listPlannerMarketCreditUnlocks,
  getGaCompanyCreditSummary,
} from '@/lib/admin/planner-market-credits';
import { PlannerMarketCreditAdjustDialog } from '@/components/admin/PlannerMarketCreditAdjustDialog';
import { PlannerMarketCreditRefundButton } from '@/components/admin/PlannerMarketCreditRefundButton';
import { GaCompanyCreditSearchBox } from '@/components/admin/GaCompanyCreditSearchBox';
import { PlannerCreditGrantPanel } from '@/components/admin/PlannerCreditGrantPanel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreditPurchaseTierCode, CreditPurchaseStatus } from '@/types/database';

const HISTORY_TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  '관리자 지급': 'success',
  구매: 'success',
  '관리자 차감': 'destructive',
  '설계사 연락처 열람': 'secondary',
};

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
export default async function AdminPlannerMarketCreditsPage({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  const [balances, purchases, unlocks, selectedCompany] = await Promise.all([
    listPlannerMarketCreditBalances(),
    listPlannerMarketCreditPurchases(),
    listPlannerMarketCreditUnlocks(),
    searchParams.company ? getGaCompanyCreditSummary(searchParams.company) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설계사 마켓 - 열람권 관리</h1>
        <p className="text-sm text-muted-foreground">GA사별 남은 열람권, 구매내역, 열람내역을 확인하고 환불/수동 지급·차감을 처리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">열람권 지급</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <GaCompanyCreditSearchBox />

          {searchParams.company && !selectedCompany && (
            <p className="py-6 text-center text-sm text-muted-foreground">해당 GA사를 찾을 수 없습니다.</p>
          )}

          {selectedCompany && (
            <div className="flex flex-col gap-5 rounded-lg border p-4">
              <div>
                <p className="text-base font-semibold">{selectedCompany.gaCompanyName}</p>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">현재 보유</p>
                    <p className="text-lg font-bold tabular-nums">{selectedCompany.totalGranted.toLocaleString()}개</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">사용</p>
                    <p className="text-lg font-bold tabular-nums">{selectedCompany.used.toLocaleString()}개</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">남은</p>
                    <p className="text-lg font-bold tabular-nums text-primary">{selectedCompany.balance.toLocaleString()}개</p>
                  </div>
                </div>
              </div>

              <PlannerCreditGrantPanel gaCompanyId={selectedCompany.gaCompanyId} gaCompanyName={selectedCompany.gaCompanyName} />

              <div>
                <p className="mb-2 text-sm font-semibold">지급/사용 이력</p>
                <div className="flex max-h-80 flex-col divide-y overflow-y-auto rounded-md border">
                  {selectedCompany.history.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">이력이 없습니다.</p>
                  ) : (
                    selectedCompany.history.map((h) => (
                      <div key={`${h.type}-${h.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={HISTORY_TYPE_VARIANT[h.type] ?? 'default'}>{h.type}</Badge>
                            <span className="truncate text-xs text-muted-foreground">{h.note}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{new Date(h.date).toLocaleString('ko-KR')}</p>
                        </div>
                        <span className={`shrink-0 font-semibold tabular-nums ${h.delta > 0 ? 'text-emerald-600' : h.delta < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {h.delta > 0 ? '+' : ''}
                          {h.delta}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
