'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 관리자의 고소득 설계사 인증 승인/반려. 승인 시 인증기간이 오늘부터 1년으로 (재)설정된다. */
export async function reviewPlannerCertificationAction(
  certificationId: string,
  decision: 'approved' | 'rejected',
  memo?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !memo?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('review_planner_certification', {
    p_certification_id: certificationId,
    p_decision: decision,
    p_memo: memo?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/planners');
  revalidatePath(`/admin/planners/${certificationId}`);
  revalidatePath('/partner/planners');
  revalidatePath('/search');
  revalidatePath('/map');
  return { success: true };
}
