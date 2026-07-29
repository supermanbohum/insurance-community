import { createAdminClient } from '@/lib/supabase/admin';
import { RestoreSubscriptionButton } from '@/components/admin/RestoreSubscriptionButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABEL: Record<string, string> = {
  active: '정상',
  past_due: '결제 실패',
  grace_period: '유예기간',
  suspended: '정지(비공개)',
  canceled: '해지',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  active: 'success',
  past_due: 'warning',
  grace_period: 'warning',
  suspended: 'destructive',
  canceled: 'outline',
};

const PLAN_LABEL: Record<string, string> = {
  branch_standard: '지점 등록비(정상가)',
  branch_early_bird: '지점 등록비(얼리버드)',
  planner_addon: '고소득 설계사 부가비',
};

/** 결제/구독 현황 - 지금은 스텁 프로바이더라 실제 결제는 항상 성공 처리된다.
 * 유예기간/정지 상태머신은 이미 완성되어 있어(0025, advance_grace_period_expirations)
 * 실 PG 연동 후에도 이 화면은 그대로 쓸 수 있다. */
export default async function AdminBillingPage() {
  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('*, ga_company:ga_company_id(name)')
    .order('created_at', { ascending: false });

  const rows = subscriptions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">결제 관리</h1>
        <p className="text-sm text-muted-foreground">
          지점 등록비/고소득 설계사 부가비 구독 현황입니다. 결제 실패 시 7일 유예 후 자동 비공개되며, 언제든 수동 복구할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">전체 구독 ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">등록된 구독이 없습니다.</p>
          ) : (
            rows.map((sub) => {
              const gaCompany = sub.ga_company as unknown as { name: string } | null;
              return (
                <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{gaCompany?.name ?? '알 수 없는 GA'}</p>
                    <p className="text-xs text-muted-foreground">
                      {PLAN_LABEL[sub.plan_code] ?? sub.plan_code} · 월 {sub.monthly_amount_krw.toLocaleString()}원
                      {sub.grace_period_ends_at && ` · 유예 종료 ${new Date(sub.grace_period_ends_at).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[sub.status]}>{STATUS_LABEL[sub.status] ?? sub.status}</Badge>
                    {(sub.status === 'past_due' || sub.status === 'grace_period' || sub.status === 'suspended') && (
                      <RestoreSubscriptionButton subscriptionId={sub.id} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
