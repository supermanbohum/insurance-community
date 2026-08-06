'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';
import { runIncomeDocOcr } from '@/lib/ocr/income-doc-ocr';
import { listPublicTopDesigners, type PublicTopDesignerCardSummary, type TopDesignerSort } from '@/lib/public/top-designer.supabase';
import type { StarTier } from '@/lib/top-designer/labels';

export type ActionResult = { success: true } | { success: false; error: string };
export type UploadResult = { success: true; path: string } | { success: false; error: string };

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** 원천징수영수증 업로드 - planner-market-income-docs 등 기존 버킷과 동일한
 * 2단계 패턴(스토리지 업로드 → RPC 실패 시 고아 파일 삭제)의 첫 단계. */
async function uploadIncomeDoc(plannerProfileId: string, file: File): Promise<UploadResult> {
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }
  const supabase = createServerSupabaseClient();
  const path = `${plannerProfileId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('top-designer-income-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

function describeSubmitError(message: string): string {
  if (message.includes('BLOCKED_JOB_TITLE')) return '대표/본부장/지점장 등 관리직은 신청할 수 없습니다. 설계사만 신청 가능합니다.';
  if (message.includes('MISSING_INCOME_DOCUMENT')) return '원천징수영수증을 업로드해주세요.';
  if (message.includes('ALREADY_APPROVED')) return '이미 승인된 인증입니다.';
  if (message.includes('NOT_AUTHORIZED')) return '본인의 설계사 프로필로만 신청할 수 있습니다.';
  return '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

/** TOP 설계사 인증 신청 - 서류 업로드 → RPC 제출 → OCR 스텁 실행(결과는 참고용,
 * 관리자가 항상 직접 확인·확정한다) 순서로 처리한다. */
export async function submitTopDesignerCertificationAction(
  plannerProfileId: string,
  input: { jobTitle: string; declaredAnnualIncomeKrw?: number },
  formData: FormData
): Promise<ActionResult> {
  await requireUser();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '원천징수영수증을 업로드해주세요.' };
  }

  const uploaded = await uploadIncomeDoc(plannerProfileId, file);
  if (!uploaded.success) return uploaded;

  const supabase = createServerSupabaseClient();
  const { data: certificationId, error } = await supabase.rpc('submit_top_designer_certification', {
    p_planner_profile_id: plannerProfileId,
    p_job_title: input.jobTitle,
    p_income_doc_path: uploaded.path,
    p_declared_annual_income_krw: input.declaredAnnualIncomeKrw,
  });

  if (error || !certificationId) {
    await createAdminClient().storage.from('top-designer-income-docs').remove([uploaded.path]);
    return { success: false, error: describeSubmitError(error?.message ?? '') };
  }

  const ocr = await runIncomeDocOcr(uploaded.path);
  if (ocr.incomeKrw !== null) {
    await createAdminClient()
      .from('top_designer_certifications')
      .update({ ocr_status: 'completed', ocr_extracted_income_krw: ocr.incomeKrw, ocr_raw_response: ocr.raw, ocr_confidence: ocr.confidence })
      .eq('id', certificationId);
  }

  revalidatePath('/top-designer');
  revalidatePath('/planner-market/my');
  return { success: true };
}

export async function toggleTopDesignerLikeAction(certificationId: string): Promise<{ success: true; liked: boolean } | { success: false; error: string }> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('toggle_top_designer_like', { p_certification_id: certificationId });
  if (error) {
    return { success: false, error: '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  revalidatePath(`/top-designer/${certificationId}`);
  return { success: true, liked: Boolean(data) };
}

/** 상세페이지 조회 기록 - 실패해도 페이지 렌더링에 영향 없게 결과를 무시한다. */
export async function recordTopDesignerViewAction(certificationId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_top_designer_view', { p_certification_id: certificationId });
}

/** "더보기" 버튼 전용 - 클라이언트 컴포넌트에서 다음 페이지를 가져온다. 이 코드베이스는
 * 클라이언트 트리거 데이터 조회를 전부 Server Action으로 처리하고 별도 API 라우트를
 * 쓰지 않는 관례를 따른다. */
export async function loadMoreTopDesignersAction(
  filters: { starTier?: StarTier; regionId?: string; sort?: TopDesignerSort },
  offset: number
): Promise<PublicTopDesignerCardSummary[]> {
  return listPublicTopDesigners({ ...filters, offset, limit: 24 });
}
