'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePartner } from '@/lib/partner/session';
import type { PlannerIncomeTier } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

async function uploadWithholdingDoc(
  branchId: string,
  formData: FormData
): Promise<{ path: string } | { error: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: '원천징수영수증 파일을 선택해주세요.' };
  }
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const path = `${branchId}/withholding-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('planner-verification-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { path };
}

/** 고소득 설계사 등록 신청 - 본인이 관리하는, 이미 승인된 지점에만 등록할 수 있다.
 * 대표/총괄/사업단장/본부장/지점장/임원 등 직책은 DB(is_blocked_planner_title)에서
 * 거부된다. 원천징수영수증은 필수이며 비공개 버킷에 저장, 관리자 승인 전용이다. */
export async function submitPlannerCertificationAction(
  input: {
    branchId: string;
    plannerName: string;
    plannerPhone: string;
    plannerCompany: string;
    jobTitle: string;
    incomeTier: PlannerIncomeTier;
  },
  formData: FormData
): Promise<ActionResult> {
  if (
    !input.branchId ||
    !input.plannerName.trim() ||
    !input.plannerPhone.trim() ||
    !input.plannerCompany.trim() ||
    !input.jobTitle.trim()
  ) {
    return { success: false, error: '모든 항목을 입력해주세요.' };
  }

  await requirePartner();

  const docResult = await uploadWithholdingDoc(input.branchId, formData);
  if ('error' in docResult) {
    return { success: false, error: docResult.error };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('submit_planner_certification', {
    p_branch_id: input.branchId,
    p_planner_name: input.plannerName.trim(),
    p_planner_phone: input.plannerPhone.trim(),
    p_planner_company: input.plannerCompany.trim(),
    p_job_title: input.jobTitle.trim(),
    p_income_tier: input.incomeTier,
    p_withholding_doc_path: docResult.path,
  });

  if (error) {
    await createAdminClient().storage.from('planner-verification-docs').remove([docResult.path]);
    const message = error.message.includes('BLOCKED_JOB_TITLE')
      ? '대표/총괄/사업단장/본부장/지점장/임원 등 관리자 직책은 등록할 수 없습니다.'
      : error.message.includes('BRANCH_NOT_APPROVED')
        ? '아직 관리자 승인이 완료되지 않은 지점입니다.'
        : '등록 신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
    return { success: false, error: message };
  }

  revalidatePath('/partner/planners');
  revalidatePath('/admin/planners');
  return { success: true };
}

/** 인증 갱신 신청 - 새 원천징수영수증만 다시 첨부하면 되며, 만료일은 관리자 승인 시에만 연장된다. */
export async function renewPlannerCertificationAction(
  certificationId: string,
  branchId: string,
  formData: FormData
): Promise<ActionResult> {
  await requirePartner();

  const docResult = await uploadWithholdingDoc(branchId, formData);
  if ('error' in docResult) {
    return { success: false, error: docResult.error };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('renew_planner_certification', {
    p_certification_id: certificationId,
    p_withholding_doc_path: docResult.path,
  });
  if (error) {
    await createAdminClient().storage.from('planner-verification-docs').remove([docResult.path]);
    return { success: false, error: '갱신 신청에 실패했습니다.' };
  }

  revalidatePath('/partner/planners');
  revalidatePath('/admin/planners');
  return { success: true };
}
