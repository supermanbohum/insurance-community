'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';
import { runIncomeDocOcr } from '@/lib/ocr/income-doc-ocr';
import { listPublicSalaryRanking, type PublicSalaryRankingCardSummary, type SalaryRankingSort } from '@/lib/public/salary-ranking.supabase';

export type ActionResult = { success: true } | { success: false; error: string };

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

async function uploadIncomeDoc(plannerProfileId: string, year: number, file: File): Promise<{ success: true; path: string } | { success: false; error: string }> {
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }
  const supabase = createServerSupabaseClient();
  const path = `${plannerProfileId}/${year}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('salary-ranking-income-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

function describeSubmitError(message: string): string {
  if (message.includes('BLOCKED_JOB_TITLE')) return '대표/본부장/지점장 등 관리직은 신청할 수 없습니다. 설계사만 신청 가능합니다.';
  if (message.includes('MISSING_INCOME_DOCUMENT')) return '원천징수영수증을 업로드해주세요.';
  if (message.includes('CONSENT_REQUIRED')) return '공개 동의가 필요합니다.';
  if (message.includes('INVALID_YEAR')) return '올바르지 않은 연도입니다.';
  if (message.includes('ALREADY_APPROVED')) return '이미 해당 연도에 승인된 등록이 있습니다.';
  if (message.includes('NOT_AUTHORIZED')) return '본인의 설계사 프로필로만 신청할 수 있습니다.';
  return '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export async function submitSalaryRankingAction(
  plannerProfileId: string,
  input: { rankingYear: number; jobTitle: string; displayName: string; declaredAnnualIncomeKrw: number; consentPublicDisplay: boolean },
  formData: FormData
): Promise<ActionResult> {
  await requireUser();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '원천징수영수증을 업로드해주세요.' };
  }

  const uploaded = await uploadIncomeDoc(plannerProfileId, input.rankingYear, file);
  if (!uploaded.success) return uploaded;

  const supabase = createServerSupabaseClient();
  const { data: submissionId, error } = await supabase.rpc('submit_salary_ranking', {
    p_planner_profile_id: plannerProfileId,
    p_ranking_year: input.rankingYear,
    p_job_title: input.jobTitle,
    p_display_name: input.displayName,
    p_income_doc_path: uploaded.path,
    p_declared_annual_income_krw: input.declaredAnnualIncomeKrw,
    p_consent_public_display: input.consentPublicDisplay,
  });

  if (error || !submissionId) {
    await createAdminClient().storage.from('salary-ranking-income-docs').remove([uploaded.path]);
    return { success: false, error: describeSubmitError(error?.message ?? '') };
  }

  const ocr = await runIncomeDocOcr(uploaded.path);
  if (ocr.incomeKrw !== null) {
    await createAdminClient()
      .from('salary_ranking_submissions')
      .update({ ocr_status: 'completed', ocr_extracted_income_krw: ocr.incomeKrw, ocr_raw_response: ocr.raw, ocr_confidence: ocr.confidence })
      .eq('id', submissionId);
  }

  revalidatePath('/salary-ranking');
  revalidatePath('/planner-market/my');
  return { success: true };
}

/** 랭킹 상세 조회 기록 - 실패해도 페이지 렌더링에 영향 없게 결과를 무시한다. */
export async function recordSalaryRankingViewAction(submissionId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_salary_ranking_view', { p_submission_id: submissionId });
}

/** "더보기" 버튼 전용 - top-designer의 loadMoreTopDesignersAction과 동일한 패턴. */
export async function loadMoreSalaryRankingAction(
  filters: { year: number; sort?: SalaryRankingSort },
  offset: number
): Promise<PublicSalaryRankingCardSummary[]> {
  return listPublicSalaryRanking({ ...filters, offset, limit: 50 });
}
