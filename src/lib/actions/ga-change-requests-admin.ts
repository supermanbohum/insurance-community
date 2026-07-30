'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 관리자의 회원 소속 GA 변경 신청 승인/반려. 승인 시 users.ga_company_id가 즉시 갱신된다. */
export async function reviewGaChangeRequestAction(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('review_ga_change_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/ga-change-requests');
  revalidatePath(`/admin/ga-change-requests/${requestId}`);
  revalidatePath('/my');
  return { success: true };
}
