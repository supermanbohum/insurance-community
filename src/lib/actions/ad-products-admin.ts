'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 광고 승인/반려 - 승인/반려 즉시 sync_branch_ad_exposure()가 실행되어 추천 지점
 * 반영이 15분 대기 없이 바로 이루어진다(RPC 내부에서 perform으로 호출, 0037 참고).
 * 반려 시 결제도 함께 환불 처리된다. */
export async function reviewBranchAdProductAction(
  adProductId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_review_branch_ad_product', {
    p_ad_product_id: adProductId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/ad-products');
  revalidatePath(`/admin/ad-products/${adProductId}`);
  revalidatePath('/search');
  revalidatePath('/map');
  revalidatePath('/');
  return { success: true };
}

/** 광고 기간 연장 - 승인됨(또는 방금 만료됨) 상태에서만 가능. */
export async function extendBranchAdProductAction(adProductId: string, newEndAt: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_extend_branch_ad_product', {
    p_ad_product_id: adProductId,
    p_new_end_at: newEndAt,
  });
  if (error) {
    return { success: false, error: '연장하지 못했습니다.' };
  }

  revalidatePath('/admin/ad-products');
  revalidatePath(`/admin/ad-products/${adProductId}`);
  return { success: true };
}
