'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

export type SalaryRankingReviewDecision = 'approved' | 'on_hold' | 'rejected' | 'pending_review';

/** 관리자의 연봉 랭킹 심사 - TOP설계사와 동일한 4단계, 별등급 없이 금액만 확정한다. */
export async function reviewSalaryRankingSubmissionAction(
  submissionId: string,
  decision: SalaryRankingReviewDecision,
  options: { confirmedIncomeKrw?: number; reason?: string } = {}
): Promise<ActionResult> {
  if (decision === 'approved' && !options.confirmedIncomeKrw) {
    return { success: false, error: '확정 연봉을 입력해주세요.' };
  }
  if ((decision === 'on_hold' || decision === 'rejected') && !options.reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_review_salary_ranking', {
    p_submission_id: submissionId,
    p_decision: decision,
    p_confirmed_income_krw: options.confirmedIncomeKrw,
    p_reason: options.reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/salary-ranking');
  revalidatePath(`/admin/salary-ranking/${submissionId}`);
  revalidatePath('/salary-ranking');
  return { success: true };
}
