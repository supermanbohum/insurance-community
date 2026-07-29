'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 관리자의 지점 등록/수정 요청 승인·반려. 승인 시 대상 지점에 즉시 반영된다. */
export async function reviewChangeRequestAction(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('review_branch_registration', {
    p_registration_id: requestId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: error.message.includes('MISSING_') ? '필수 서류 또는 사진이 모두 등록되지 않았습니다.' : '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/change-requests');
  revalidatePath(`/admin/change-requests/${requestId}`);
  revalidatePath('/admin/ga');
  revalidatePath('/partner');
  revalidatePath('/search');
  revalidatePath('/map');
  revalidatePath('/');
  return { success: true };
}
