'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requirePartner } from '@/lib/partner/session';
import { getPaymentProvider } from '@/lib/payments/provider';
import { AD_PRODUCT_CATALOG } from '@/lib/ad-products/catalog';
import { PAYMENTS_LIVE } from '@/lib/config/payments';
import type { AdProductType } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };

/** 지점 광고 상품 구매 - GA 파트너 전용, 본인 소속 지점만. 서버 RPC(purchase_branch_ad_product)가
 * 실제 과금 기준이다 - 여기 금액은 스텁 PaymentProvider.chargeOnce에 넘길 표시용 참고값. */
export async function purchaseBranchAdProductAction(
  branchId: string,
  productType: AdProductType,
  startAt: string,
  endAt: string,
  paymentMethod: 'card' | 'bank_transfer' | 'naver_pay' | 'kakao_pay' | 'google_pay'
): Promise<ActionResult> {
  if (!PAYMENTS_LIVE) {
    return { success: false, error: '현재 광고 상품 구매는 열려있지 않습니다.' };
  }

  const catalogItem = AD_PRODUCT_CATALOG.find((item) => item.type === productType);
  if (!catalogItem) {
    return { success: false, error: '알 수 없는 광고 상품입니다.' };
  }
  if (!catalogItem.isLive) {
    return { success: false, error: '아직 준비 중인 상품입니다.' };
  }
  if (new Date(endAt) <= new Date(startAt)) {
    return { success: false, error: '종료일은 시작일 이후여야 합니다.' };
  }

  await requirePartner();

  const charge = await getPaymentProvider().chargeOnce({
    purpose: 'branch_ad_product',
    amountKrw: Math.round(catalogItem.priceKrw * 1.1),
    paymentMethod,
  });
  if (!charge.succeeded) {
    return { success: false, error: charge.failureReason ?? '결제에 실패했습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('purchase_branch_ad_product', {
    p_branch_id: branchId,
    p_product_type: productType,
    p_start_at: startAt,
    p_end_at: endAt,
    p_payment_method: paymentMethod,
    p_pg_tid: charge.providerTransactionRef,
  });
  if (error) {
    return { success: false, error: '구매 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/partner/ad-products');
  revalidatePath('/partner/ad-products/history');
  revalidatePath('/admin/ad-products');
  return { success: true };
}
