import { redirect } from 'next/navigation';
import { getCurrentPartner } from '@/lib/partner/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreditTierCard, type CreditTier } from '@/components/planner-market/CreditTierCard';
import { CreditPurchaseHistoryTable } from '@/components/planner-market/CreditPurchaseHistoryTable';
import { BackButton } from '@/components/shared/BackButton';
import { PAYMENTS_LIVE } from '@/lib/config/payments';

const TIERS: CreditTier[] = [
  { tierCode: 'credits_10', creditCount: 10, amountKrw: 330000, unitPriceKrw: 33000 },
  { tierCode: 'credits_30', creditCount: 30, amountKrw: 990000, unitPriceKrw: 33000 },
  { tierCode: 'credits_50', creditCount: 50, amountKrw: 1650000, unitPriceKrw: 33000 },
  {
    tierCode: 'credits_100',
    creditCount: 100,
    amountKrw: 3000000,
    unitPriceKrw: 30000,
    originalAmountKrw: 3300000,
    discountLabel: '10% 할인',
    isBest: true,
  },
];

/** 열람권 구매 - GA 파트너 전용. requirePartner()는 next= 파라미터 없이 /login으로
 * 보내므로, 여기서는 직접 확인해 로그인 후 이 페이지로 돌아올 수 있게 한다. */
export default async function PlannerMarketPurchasePage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect('/login?next=/planner-market/purchase');
  }

  const supabase = createServerSupabaseClient();
  const [{ data: balance }, { data: purchases }] = await Promise.all([
    supabase.rpc('get_my_planner_market_credit_balance'),
    supabase.rpc('list_my_planner_market_credit_purchases'),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <BackButton />
      <h1 className="text-xl font-bold">설계사 열람권 구매</h1>

      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
        <p className="text-sm text-brand-700">현재 보유 열람권</p>
        <p className="text-3xl font-extrabold text-brand-800">[ {(balance ?? 0).toLocaleString()}건 ]</p>
      </div>

      {PAYMENTS_LIVE ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map((tier) => (
            <CreditTierCard key={tier.tierCode} tier={tier} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">현재 열람권 구매는 열려있지 않습니다. 문의는 고객센터로 연락해주세요.</p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-bold">구매내역</h2>
        <CreditPurchaseHistoryTable
          rows={(purchases ?? []).map((p) => ({
            id: p.id,
            tierCode: p.tier_code,
            creditCount: p.credit_count,
            amountKrw: p.amount_krw,
            status: p.status,
            createdAt: p.created_at,
          }))}
        />
      </div>

      <div className="rounded-2xl border border-line bg-surface-sunken p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-bold text-ink-soft">안내</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li>최소 구매 수량은 10건입니다.</li>
          <li>열람권은 연락처 조회 시 1건 차감됩니다.</li>
          <li>구매 후 환불은 불가능합니다.</li>
          <li>열람권에는 유효기간이 없습니다.</li>
          <li>부가가치세 포함 금액입니다.</li>
        </ul>
      </div>
    </div>
  );
}
