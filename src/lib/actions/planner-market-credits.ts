'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePartner } from '@/lib/partner/session';
import { getPaymentProvider } from '@/lib/payments/provider';
import type { CreditPurchaseTierCode } from '@/types/database';

const PLANNER_PHOTO_BUCKET = 'planner-market-profile-photos';
const PLANNER_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1시간 - 상세 화면 체류 시간에 여유를 둔 값.

export type ActionResult = { success: true } | { success: false; error: string };

/** 서버 RPC(purchase_planner_market_credits)가 실제 과금 기준(단일 진실 소스)이다 -
 * 여기 금액은 스텁 PaymentProvider.chargeOnce에 넘길 표시용 참고값일 뿐이다. */
const TIER_AMOUNTS_KRW: Record<CreditPurchaseTierCode, number> = {
  credits_1: 33000,
  credits_10: 330000,
  credits_30: 990000,
  credits_50: 1650000,
  credits_100: 3000000,
};

/** 열람권 구매 - GA 파트너 전용. 결제는 스텁(chargeOnce, 항상 성공)이고 실 PG는 이후 연동. */
export async function purchasePlannerMarketCreditsAction(
  tierCode: CreditPurchaseTierCode,
  paymentMethod: 'card' | 'bank_transfer' | 'naver_pay' | 'kakao_pay' | 'google_pay'
): Promise<ActionResult> {
  await requirePartner();

  const charge = await getPaymentProvider().chargeOnce({
    purpose: 'planner_market_credits',
    amountKrw: TIER_AMOUNTS_KRW[tierCode],
    paymentMethod,
  });
  if (!charge.succeeded) {
    return { success: false, error: charge.failureReason ?? '결제에 실패했습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('purchase_planner_market_credits', {
    p_tier_code: tierCode,
    p_payment_method: paymentMethod,
    p_provider_transaction_ref: charge.providerTransactionRef,
  });
  if (error) {
    return { success: false, error: '구매 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/planner-market/purchase');
  revalidatePath('/planner-market/history');
  return { success: true };
}

export type UnlockContactResult =
  | { success: true; contact: { name: string; phone: string; email: string; kakaoId: string | null; photoUrl: string | null } }
  | { success: false; error: string; code?: 'INSUFFICIENT_CREDITS' };

/** 설계사 연락처(+프로필 사진) 열람 - 동일 GA사가 같은 설계사를 재조회해도 크레딧이
 * 다시 차감되지 않는다(get_planner_contact RPC의 원자적 언락 로직, 0036 참고).
 * 사진은 W-064 v2(오너 지시)로 연락처와 같은 열람권 게이팅 대상이 됐다 - 버킷이
 * 비공개라 RPC가 돌려주는 storage path만으로는 브라우저가 못 열고, 서비스 롤로
 * signed URL을 새로 발급해야 한다. RPC 자체가 이미 "이 GA사가 이 설계사를 열람할
 * 권한이 있는지"를 검증한 뒤에만 path를 돌려주므로, 여기서 별도 권한 체크를
 * 반복하지 않는다(권한 판단의 단일 소스는 RPC 하나로 유지). */
export async function unlockPlannerContactAction(plannerProfileId: string): Promise<UnlockContactResult> {
  await requirePartner();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_planner_contact', { p_planner_profile_id: plannerProfileId }).single();

  if (error || !data) {
    if (error?.message.includes('INSUFFICIENT_CREDITS')) {
      return { success: false, error: '보유한 열람권이 부족합니다. 열람권을 구매해주세요.', code: 'INSUFFICIENT_CREDITS' };
    }
    const message = error?.message.includes('CONTACT_SHARING_REVOKED')
      ? '설계사가 연락처 제공을 철회했습니다.'
      : error?.message.includes('PROFILE_NOT_AVAILABLE')
        ? '더 이상 열람할 수 없는 설계사입니다.'
        : '연락처를 불러오지 못했습니다.';
    return { success: false, error: message };
  }

  let photoUrl: string | null = null;
  if (data.profile_photo_path) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from(PLANNER_PHOTO_BUCKET)
      .createSignedUrl(data.profile_photo_path, PLANNER_PHOTO_SIGNED_URL_TTL_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  revalidatePath('/planner-market/purchase');
  return { success: true, contact: { name: data.name, phone: data.phone, email: data.email, kakaoId: data.kakao_id, photoUrl } };
}
