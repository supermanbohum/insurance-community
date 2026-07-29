'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { searchApprovedBranchesLite, type BranchSearchResultLite } from '@/lib/public/branch';
import type { PlannerIncomeTier } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** TOP설계사(고소득 설계사) 검색형 자동완성 - 지점등록/로그인과 무관한 완전 공개 검색이므로
 * 세션 없이 호출 가능한 anon 클라이언트 기반 조회만 노출한다(searchApprovedBranchesLite 참고). */
export async function searchBranchesForTopPlannerAction(query: string): Promise<BranchSearchResultLite[]> {
  return searchApprovedBranchesLite(query);
}

/** TOP설계사 공개 신청 - 지점등록/파트너 로그인과 완전히 분리된 별도 기능이다. 로그인
 * 세션이 전혀 없으므로 anon 클라이언트로 업로드/RPC를 호출하고(파트너 경로의
 * submitPlannerCertificationAction과 달리 requirePartner()를 쓰지 않는다), 지점은 반드시
 * searchApprovedBranchesLite로 검색해 얻은 실제 ga_branch.id(FK)만 전달받는다 - 지점명을
 * 문자열로 저장하지 않는다. */
export async function submitTopPlannerApplicationAction(
  input: {
    branchId: string;
    branchName: string;
    plannerName: string;
    plannerPhone: string;
    plannerCompany: string;
    incomeTier: PlannerIncomeTier;
  },
  formData: FormData
): Promise<ActionResult> {
  if (
    !input.branchId ||
    !input.branchName.trim() ||
    !input.plannerName.trim() ||
    !input.plannerPhone.trim() ||
    !input.plannerCompany.trim()
  ) {
    return { success: false, error: '모든 항목을 입력해주세요.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '원천징수영수증 파일을 선택해주세요.' };
  }
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const path = `${input.branchId}/public-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('planner-verification-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error } = await supabase.rpc('submit_top_planner_application', {
    p_branch_id: input.branchId,
    p_planner_name: input.plannerName.trim(),
    p_planner_phone: input.plannerPhone.trim(),
    p_planner_company: input.plannerCompany.trim(),
    p_income_tier: input.incomeTier,
    p_withholding_doc_path: path,
  });

  if (error) {
    await createAdminClient().storage.from('planner-verification-docs').remove([path]);
    const message = error.message.includes('BRANCH_NOT_ELIGIBLE')
      ? '선택한 지점을 찾을 수 없습니다. 다시 검색해주세요.'
      : '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
    return { success: false, error: message };
  }

  revalidatePath('/admin/planners');
  return { success: true };
}
