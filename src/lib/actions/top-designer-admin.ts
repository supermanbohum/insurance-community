'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { StarTier } from '@/lib/top-designer/labels';

export type ActionResult = { success: true } | { success: false; error: string };

export type TopDesignerReviewDecision = 'approved' | 'on_hold' | 'rejected' | 'pending_review';

/** 관리자의 TOP 설계사 인증 심사 - 승인/보류/반려/재심사(보류→대기) 4단계.
 * 승인 시 별등급+확정금액 필수, 보류/반려 시 사유 필수 (RPC가 동일하게 검증하지만
 * 클라이언트에 더 이르게 알려주기 위해 여기서도 검증한다). */
export async function reviewTopDesignerCertificationAction(
  certificationId: string,
  decision: TopDesignerReviewDecision,
  options: { starTier?: StarTier; confirmedIncomeKrw?: number; reason?: string } = {}
): Promise<ActionResult> {
  if (decision === 'approved' && (!options.starTier || !options.confirmedIncomeKrw)) {
    return { success: false, error: '별등급과 확정 연봉을 입력해주세요.' };
  }
  if ((decision === 'on_hold' || decision === 'rejected') && !options.reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_review_top_designer_certification', {
    p_certification_id: certificationId,
    p_decision: decision,
    p_star_tier: options.starTier,
    p_confirmed_income_krw: options.confirmedIncomeKrw,
    p_reason: options.reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/top-designer');
  revalidatePath(`/admin/top-designer/${certificationId}`);
  revalidatePath('/top-designer');
  return { success: true };
}
