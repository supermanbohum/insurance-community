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
 * 실제 파일을 지운다. 심사 기록(신청자·일시·등급·처리자·결과)은 행에 그대로 남는다.
 *
 * 🔴 RPC가 경로 컬럼을 null로 비운 뒤에 Storage remove()가 실패하면, DB에는 더 이상
 * 그 경로가 남아있지 않아 나중에 orphan 파일을 찾을 길이 없어진다(CTO 지적). remove()
 * 실패를 조용히 삼키지 않고 기존 audit_logs(0053에서 다른 관리자 액션들이 이미 쓰는
 * 표)에 실패한 경로를 기록해 관리자가 /admin/audit-log에서 발견하고 수동으로
 * 지울 수 있게 한다. */
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

  const adminSession = await requireAdmin();
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
    const { error: purgeError } = await admin.storage.from('top-designer-income-docs').remove(pathsToPurge);
    if (purgeError) {
      await admin.from('audit_logs').insert({
        admin_id: adminSession.id,
        target_type: 'top_designer_certification',
        target_id: certificationId,
        action: 'document_purge_failed',
        reason_detail: `파일 삭제 실패 - 수동 확인 필요: ${pathsToPurge.join(', ')} (${purgeError.message})`,
      });
    }
  }

  revalidatePath('/admin/top-designer');
  revalidatePath(`/admin/top-designer/${certificationId}`);
  revalidatePath('/top-designer');
  return { success: true };
}

/** E(재심사) 관리자 처리 - 승인/보류/반려/재심사(보류→대기) 4단계는 최초 심사와
 * 동일한 패턴이지만, 대상이 top_designer_certification_revisions다. 승인 시에만
 * RPC가 원본 top_designer_certifications를 갱신한다 - 반려/보류는 원본을 건드리지
 * 않으므로 "반려 시 기존 등급 유지"가 자동으로 성립한다(0091 설계).
 *
 * 서류 파기는 최초 심사와 동일한 이유(storage.protect_delete 트리거)로 RPC가 경로만
 * null로 비우고, 여기서 Storage API로 실제 파일을 지운다. */
export async function reviewTopDesignerCertificationRevisionAction(
  revisionId: string,
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

  const adminSession = await requireAdmin();
  const supabase = createServerSupabaseClient();
  const admin = createAdminClient();

  let pathsToPurge: string[] = [];
  if (decision === 'approved' || decision === 'rejected') {
    const { data: row } = await admin
      .from('top_designer_certification_revisions')
      .select('income_doc_storage_path, business_card_path')
      .eq('id', revisionId)
      .maybeSingle();
    pathsToPurge = [row?.income_doc_storage_path, row?.business_card_path].filter((p): p is string => Boolean(p));
  }

  const { error } = await supabase.rpc('admin_review_top_designer_certification_revision', {
    p_revision_id: revisionId,
    p_decision: decision,
    p_star_tier: options.starTier,
    p_confirmed_income_krw: options.confirmedIncomeKrw,
    p_reason: options.reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  if (pathsToPurge.length > 0) {
    const { error: purgeError } = await admin.storage.from('top-designer-income-docs').remove(pathsToPurge);
    if (purgeError) {
      await admin.from('audit_logs').insert({
        admin_id: adminSession.id,
        target_type: 'top_designer_certification_revision',
        target_id: revisionId,
        action: 'document_purge_failed',
        reason_detail: `파일 삭제 실패 - 수동 확인 필요: ${pathsToPurge.join(', ')} (${purgeError.message})`,
      });
    }
  }

  revalidatePath('/admin/top-designer');
  revalidatePath(`/admin/top-designer/${certificationId}`);
  revalidatePath('/top-designer');
  revalidatePath(`/top-designer/${certificationId}`);
  return { success: true };
}
