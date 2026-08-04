'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 설계사 등록 승인/반려 - 승인돼야만 "설계사 찾기"에 공개된다(public_planner_profiles 뷰). */
export async function reviewPlannerMarketProfileAction(
  profileId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_review_planner_market_profile', {
    p_planner_profile_id: profileId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/planner-market');
  revalidatePath(`/admin/planner-market/${profileId}`);
  revalidatePath('/planner-market');
  revalidatePath('/planner-market/search');
  return { success: true };
}

/** 인증 설계사 배지 승인/반려. */
export async function reviewPlannerMarketCertificationAction(
  certificationId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_review_planner_market_certification', {
    p_certification_id: certificationId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/planner-market/certifications');
  revalidatePath(`/admin/planner-market/certifications/${certificationId}`);
  revalidatePath('/planner-market');
  return { success: true };
}

/** 열람권 수동 지급/차감 - delta 양수면 지급, 음수면 차감. 항상 사유가 필요하다(감사로그). */
export async function adjustPlannerMarketCreditsAction(gaCompanyId: string, delta: number, reason: string): Promise<ActionResult> {
  if (!reason.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }
  if (delta === 0) {
    return { success: false, error: '변동량을 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_adjust_planner_market_credits', {
    p_ga_company_id: gaCompanyId,
    p_delta: delta,
    p_reason: reason.trim(),
  });
  if (error) {
    const message = error.message.includes('BALANCE_WOULD_GO_NEGATIVE') ? '차감 후 잔액이 0 미만이 될 수 없습니다.' : '처리하지 못했습니다.';
    return { success: false, error: message };
  }

  revalidatePath('/admin/planner-market/credits');
  return { success: true };
}

/** 열람권 구매 환불 - 이미 소진된 만큼은 환불할 수 없다(관리자가 수동 차감으로 별도 처리). */
export async function refundPlannerMarketCreditPurchaseAction(purchaseId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_refund_planner_market_credit_purchase', {
    p_purchase_id: purchaseId,
    p_reason: reason.trim(),
  });
  if (error) {
    const message = error.message.includes('INSUFFICIENT_BALANCE_FOR_REFUND')
      ? '이미 소진된 열람권이 있어 환불할 수 없습니다. 수동 차감을 이용해주세요.'
      : '처리하지 못했습니다.';
    return { success: false, error: message };
  }

  revalidatePath('/admin/planner-market/credits');
  return { success: true };
}
