'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { StarTier } from '@/lib/top-designer/labels';

export type ActionResult = { success: true } | { success: false; error: string };

export type TopDesignerReviewDecision = 'approved' | 'on_hold' | 'rejected' | 'pending_review';

/** 관리자의 TOP 설계사 인증 심사 - 승인/보류/반려/재심사(보류→대기) 4단계.
 * 승인 시 별등급+확정금액 필수, 보류/반려 시 사유 필수 (RPC가 동일하게 검증하지만
 * 클라이언트에 더 이르게 알려주기 위해 여기서도 검증한다).
 *
 * 승인/반려로 심사가 "완료"되면 원천징수영수증·명함을 지체 없이 파기한다(콘텐츠팀
 * 확정 정책). 이 프로젝트의 storage.objects에는 직접 SQL DELETE를 막는 트리거가
 * 걸려 있어("Use the Storage API instead.") RPC 안에서 지울 수 없다 - RPC 호출
 * 전에 경로를 읽어두고, RPC가 경로 컬럼을 null로 비운 뒤 여기서 Storage API로
 * 실제 파일을 지운다. 심사 기록(신청자·일시·등급·처리자·결과)은 행에 그대로 남는다. */
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
  const admin = createAdminClient();

  let pathsToPurge: string[] = [];
  if (decision === 'approved' || decision === 'rejected') {
    const { data: row } = await admin
      .from('top_designer_certifications')
      .select('income_doc_storage_path, business_card_path')
      .eq('id', certificationId)
      .maybeSingle();
    pathsToPurge = [row?.income_doc_storage_path, row?.business_card_path].filter((p): p is string => Boolean(p));
  }

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

  if (pathsToPurge.length > 0) {
    await admin.storage.from('top-designer-income-docs').remove(pathsToPurge);
  }

  revalidatePath('/admin/top-designer');
  revalidatePath(`/admin/top-designer/${certificationId}`);
  revalidatePath('/top-designer');
  return { success: true };
}
