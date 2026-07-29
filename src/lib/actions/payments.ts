'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentProvider } from '@/lib/payments/provider';

/**
 * 구독 생성 직후 첫 결제를 즉시 시도한다. 지금은 스텁 프로바이더라 항상 성공하고
 * record_payment_result(서비스롤 전용 RPC)로 결과를 기록한다 - 실 PG 연동 후에도
 * 이 함수의 바깥 시그니처는 그대로 두고 getPaymentProvider() 구현체만 바뀐다.
 */
async function chargeSubscription(subscriptionId: string, amountKrw: number): Promise<void> {
  const provider = getPaymentProvider();
  const result = await provider.chargeRecurring({
    subscriptionId,
    amountKrw,
    paymentMethodRef: 'stub',
  });

  const admin = createAdminClient();
  const { error } = await admin.rpc('record_payment_result', {
    p_subscription_id: subscriptionId,
    p_succeeded: result.succeeded,
    p_amount_krw: amountKrw,
    p_provider_transaction_ref: result.providerTransactionRef,
    p_failure_reason: result.failureReason ?? undefined,
  });
  if (error) throw error;
}

/** 지점 등록비 구독 시작 - 선착순 100개는 자동으로 얼리버드 요금이 적용된다. */
export async function createBranchSubscriptionAction(
  branchId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const { data: subscriptionId, error } = await supabase.rpc('create_branch_subscription', {
    p_branch_id: branchId,
  });
  if (error) return { success: false, error: error.message };

  const { data: sub } = await supabase.from('subscriptions').select('monthly_amount_krw').eq('id', subscriptionId).single();
  if (sub) await chargeSubscription(subscriptionId, sub.monthly_amount_krw);

  revalidatePath('/partner');
  return { success: true };
}

/** 고소득 설계사 부가비 구독 시작 (인증 승인 후). */
export async function createPlannerAddonSubscriptionAction(
  certificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const { data: subscriptionId, error } = await supabase.rpc('create_planner_addon_subscription', {
    p_certification_id: certificationId,
  });
  if (error) return { success: false, error: error.message };

  const { data: sub } = await supabase.from('subscriptions').select('monthly_amount_krw').eq('id', subscriptionId).single();
  if (sub) await chargeSubscription(subscriptionId, sub.monthly_amount_krw);

  revalidatePath('/partner');
  return { success: true };
}

/** 관리자 - 결제 유예/정지 상태를 수동으로 복구(지점 재공개 포함). */
export async function adminRestoreSubscriptionAction(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_restore_subscription', { p_subscription_id: subscriptionId });
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  return { success: true };
}
