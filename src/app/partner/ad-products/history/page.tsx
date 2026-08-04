import { requirePartner } from '@/lib/partner/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdProductHistoryTable } from '@/components/partner/AdProductHistoryTable';
import { AD_PRODUCT_LABEL } from '@/lib/ad-products/catalog';

/** 광고 상품 구매내역 - 본인 소속 지점의 광고만 RLS로 자동 스코프된다. */
export default async function PartnerAdProductsHistoryPage() {
  await requirePartner();
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase.from('branch_ad_products').select('*').order('created_at', { ascending: false });
  const rows = products ?? [];

  const branchIds = Array.from(new Set(rows.map((r) => r.branch_id)));
  const paymentIds = Array.from(new Set(rows.map((r) => r.payment_id).filter((v): v is string => Boolean(v))));

  const [{ data: branches }, { data: payments }] = await Promise.all([
    branchIds.length > 0 ? supabase.from('ga_branch').select('id, name').in('id', branchIds) : Promise.resolve({ data: [] }),
    paymentIds.length > 0 ? supabase.from('ad_payments').select('id, total_amount').in('id', paymentIds) : Promise.resolve({ data: [] }),
  ]);
  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const amountByPaymentId = new Map((payments ?? []).map((p) => [p.id, p.total_amount]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">광고 상품 구매내역</h1>
      </div>
      <AdProductHistoryTable
        rows={rows.map((r) => ({
          id: r.id,
          branchName: branchNameById.get(r.branch_id) ?? '알 수 없는 지점',
          productLabel: AD_PRODUCT_LABEL[r.product_type] ?? r.product_type,
          startAt: r.start_at,
          endAt: r.end_at,
          status: r.status,
          amountKrw: r.payment_id ? (amountByPaymentId.get(r.payment_id) ?? null) : null,
        }))}
      />
    </div>
  );
}
