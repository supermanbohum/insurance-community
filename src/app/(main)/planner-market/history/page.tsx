import { redirect } from 'next/navigation';
import { getCurrentPartner } from '@/lib/partner/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreditPurchaseHistoryTable } from '@/components/planner-market/CreditPurchaseHistoryTable';
import { BackButton } from '@/components/shared/BackButton';

/** 구매내역 - GA 파트너 전용. */
export default async function PlannerMarketHistoryPage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect('/login?next=/planner-market/history');
  }

  const supabase = createServerSupabaseClient();
  const { data: purchases } = await supabase.rpc('list_my_planner_market_credit_purchases');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <BackButton />
      <h1 className="text-xl font-bold">열람권 구매내역</h1>
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
  );
}
