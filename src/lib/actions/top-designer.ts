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
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** 원천징수영수증 업로드 - 폴더 접두사는 user.id(current_member_id) - 마켓과 완전
 * 분리된 자체 스키마라 planner_profile_id를 더 이상 참조하지 않는다. */
export async function uploadTopDesignerIncomeDocAction(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '원천징수영수증을 선택해주세요.' };
  }
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('top-designer-income-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

/** 명함 업로드 - 오너 지시(2026-08-09) - 소득은 원천징수영수증, 소속·직급은 명함으로
 * 증명한다. 원천징수영수증과 같은 버킷(top-designer-income-docs)을 그대로 쓴다 -
 * 둘 다 "심사용 서류"로 보유정책(심사 완료 후 지체 없이 파기)이 동일하다. */
export async function uploadTopDesignerBusinessCardAction(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '명함을 선택해주세요.' };
  }
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('top-designer-income-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

/** 프로필 사진 업로드 - 마켓의 planner-market-profile-photos와 동일 패턴, 별개 버킷. */
export async function uploadTopDesignerPhotoAction(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '사진 파일을 선택해주세요.' };
  }
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: '이미지는 최대 5MB까지 업로드할 수 있습니다.' };
  }
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('top-designer-profile-photos')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

function describeSubmitError(message: string): string {
  // BLOCKED_JOB_TITLE 매핑은 0084에서 관리직 차단을 없애며 함께 제거했다 - 이제
  // submit_top_designer_certification이 이 코드를 던질 일이 없다(오너 지시 ⑩).
  if (message.includes('MISSING_INCOME_DOCUMENT')) return '원천징수영수증을 업로드해주세요.';
  if (message.includes('MISSING_BUSINESS_CARD')) return '명함을 업로드해주세요.';
  if (message.includes('ALREADY_APPROVED')) return '이미 승인된 인증입니다.';
  if (message.includes('CONSENT_PUBLIC_DISPLAY_REQUIRED')) return '실명·소속·별등급 공개 동의가 필요합니다.';
  if (message.includes('CONSENT_DOCUMENT_COLLECTION_REQUIRED')) return '서류 수집·이용 동의가 필요합니다.';
  if (message.includes('PHOTO_PUBLIC_CHOICE_REQUIRED')) return '프로필 사진 공개 여부를 선택해주세요.';
  if (message.includes('INVALID_GA_COMPANY')) return 'GA를 선택해주세요.';
  return '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export interface TopDesignerSubmitInput {
  name: string;
  gaCompanyId: string;
  branchName?: string;
  jobTitle: string;
  careerYears?: number;
  selfIntroduction?: string;
  declaredAnnualIncomeKrw?: number;
  incomeDocPath: string;
  businessCardPath: string;
  photoPath?: string | null;
  photoPublic?: boolean | null;
  consentPublicDisplay: boolean;
  consentDocumentCollection: boolean;
}

/** TOP 설계사 인증 신청 - RPC 제출 → OCR 스텁 실행(결과는 참고용, 관리자가 항상 직접
 * 확인·확정한다) 순서로 처리한다. 서류/사진 업로드는 폼에서 먼저 별도 액션으로 끝내고
 * 경로만 여기로 넘어온다. */
export async function submitTopDesignerCertificationAction(input: TopDesignerSubmitInput): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { data: certificationId, error } = await supabase.rpc('submit_top_designer_certification', {
    p_name: input.name.trim(),
    p_ga_company_id: input.gaCompanyId,
    p_job_title: input.jobTitle.trim(),
    p_income_doc_path: input.incomeDocPath,
    p_business_card_path: input.businessCardPath,
    p_consent_public_display: input.consentPublicDisplay,
    p_consent_document_collection: input.consentDocumentCollection,
    p_branch_name: input.branchName?.trim() || null,
    p_career_years: input.careerYears ?? null,
    p_self_introduction: input.selfIntroduction?.trim() || null,
    p_declared_annual_income_krw: input.declaredAnnualIncomeKrw ?? null,
    p_photo_path: input.photoPath ?? null,
    p_photo_public: input.photoPublic ?? null,
  });

  if (error || !certificationId) {
    if (input.incomeDocPath) await createAdminClient().storage.from('top-designer-income-docs').remove([input.incomeDocPath]);
    if (input.businessCardPath) await createAdminClient().storage.from('top-designer-income-docs').remove([input.businessCardPath]);
    if (input.photoPath) await createAdminClient().storage.from('top-designer-profile-photos').remove([input.photoPath]);
    return { success: false, error: describeSubmitError(error?.message ?? '') };
  }

  const ocr = await runIncomeDocOcr(input.incomeDocPath);
  if (ocr.incomeKrw !== null) {
    await createAdminClient()
      .from('top_designer_certifications')
      .update({ ocr_status: 'completed', ocr_extracted_income_krw: ocr.incomeKrw, ocr_raw_response: ocr.raw, ocr_confidence: ocr.confidence })
      .eq('id', certificationId);
  }

  revalidatePath('/top-designer');
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
  filters: { starTier?: StarTier; sort?: TopDesignerSort },
  offset: number
): Promise<PublicTopDesignerCardSummary[]> {
  return listPublicTopDesigners({ ...filters, offset, limit: 24 });
}
