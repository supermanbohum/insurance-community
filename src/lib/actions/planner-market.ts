'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';

export type ActionResult = { success: true } | { success: false; error: string };
export type UploadResult = { success: true; path: string } | { success: false; error: string };

export interface PlannerMarketProfileInput {
  name: string;
  phone: string;
  email: string;
  kakaoId?: string;
  profilePhotoPath?: string | null;
  activeRegionId: string;
  careerYears: number;
  specialties: string[];
  currentlyEmployed: boolean;
  jobSearchStatus: 'actively_looking' | 'open_to_offers' | 'not_looking';
  desiredStartTiming?: 'immediate' | 'within_1_month' | 'within_3_months' | 'negotiable' | null;
  contactableTimes: Array<'morning' | 'afternoon' | 'evening' | 'weekend' | 'anytime'>;
  selfIntroduction?: string;
  desiredRegionId?: string | null;
  desiredGaCompanyId?: string | null;
  desiredConditions?: string;
}

function validateProfileInput(input: PlannerMarketProfileInput): string | null {
  if (!input.name.trim() || !input.phone.trim() || !input.email.trim()) {
    return '이름, 연락처, 이메일을 입력해주세요.';
  }
  if (!input.activeRegionId) {
    return '활동지역을 선택해주세요.';
  }
  return null;
}

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** 프로필 사진 업로드 - 공개 버킷(planner-market-profile-photos). 등록/수정 폼에서
 * 먼저 호출해 경로를 받아온 뒤, submit/update 액션에 profilePhotoPath로 전달한다. */
export async function uploadPlannerMarketPhotoAction(formData: FormData): Promise<UploadResult> {
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
    .from('planner-market-profile-photos')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  return { success: true, path };
}

/** 설계사 등록 - 일반회원(이메일 인증 완료)만 가능. 동의 5종은 항상 모두 true로만
 * 제출할 수 있다(체크박스 UI가 강제, RPC도 다시 검증). */
export async function submitPlannerMarketProfileAction(
  input: PlannerMarketProfileInput,
  consents: {
    contactPaidView: boolean;
    recruitContact: boolean;
    privacyPolicy: boolean;
    thirdPartyShare: boolean;
    withdrawalNotice: boolean;
  }
): Promise<ActionResult> {
  const validationError = validateProfileInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }
  if (
    !consents.contactPaidView ||
    !consents.recruitContact ||
    !consents.privacyPolicy ||
    !consents.thirdPartyShare ||
    !consents.withdrawalNotice
  ) {
    return { success: false, error: '모든 필수 동의 항목에 체크해주세요.' };
  }

  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('submit_planner_market_profile', {
    p_name: input.name.trim(),
    p_phone: input.phone.trim(),
    p_email: input.email.trim(),
    p_active_region_id: input.activeRegionId,
    p_career_years: input.careerYears,
    p_specialties: input.specialties,
    p_currently_employed: input.currentlyEmployed,
    p_job_search_status: input.jobSearchStatus,
    p_desired_start_timing: input.desiredStartTiming ?? null,
    p_contactable_times: input.contactableTimes,
    p_consent_contact_paid_view: consents.contactPaidView,
    p_consent_recruit_contact: consents.recruitContact,
    p_consent_privacy_policy: consents.privacyPolicy,
    p_consent_third_party_share: consents.thirdPartyShare,
    p_consent_withdrawal_notice: consents.withdrawalNotice,
    p_kakao_id: input.kakaoId?.trim() || null,
    p_profile_photo_path: input.profilePhotoPath ?? null,
    p_self_introduction: input.selfIntroduction?.trim() || null,
    p_desired_region_id: input.desiredRegionId ?? null,
    p_desired_ga_company_id: input.desiredGaCompanyId ?? null,
    p_desired_conditions: input.desiredConditions?.trim() || null,
  });

  if (error) {
    const message = error.message.includes('PROFILE_ALREADY_EXISTS')
      ? '이미 등록된 설계사 정보가 있습니다.'
      : error.message.includes('CONSENT_REQUIRED')
        ? '모든 필수 동의 항목에 체크해주세요.'
        : '등록에 실패했습니다. 잠시 후 다시 시도해주세요.';
    return { success: false, error: message };
  }

  revalidatePath('/planner-market');
  revalidatePath('/planner-market/my');
  revalidatePath('/admin/planner-market');
  return { success: true };
}

/** 설계사 정보 수정 - 소유자만 가능. 즉시반영 항목(연락처/사진/자기소개/구직상태 등)은
 * 저장 즉시 반영되고, 재승인 대상(활동지역/경력/희망GA)은 별도로 관리자 승인을 거친다
 * (item 12) - 연락처 하나만 고쳐도 검색결과에서 재검수 대기로 사라지던 문제를 없앤다. */
export async function updatePlannerMarketProfileAction(
  plannerProfileId: string,
  input: PlannerMarketProfileInput
): Promise<ActionResult> {
  const validationError = validateProfileInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  await requireUser();
  const supabase = createServerSupabaseClient();

  const { error: instantError } = await supabase.rpc('update_planner_market_profile_instant', {
    p_planner_profile_id: plannerProfileId,
    p_name: input.name.trim(),
    p_phone: input.phone.trim(),
    p_email: input.email.trim(),
    p_specialties: input.specialties,
    p_currently_employed: input.currentlyEmployed,
    p_job_search_status: input.jobSearchStatus,
    p_desired_start_timing: input.desiredStartTiming ?? null,
    p_contactable_times: input.contactableTimes,
    p_kakao_id: input.kakaoId?.trim() || null,
    p_profile_photo_path: input.profilePhotoPath ?? null,
    p_self_introduction: input.selfIntroduction?.trim() || null,
    p_desired_region_id: input.desiredRegionId ?? null,
    p_desired_conditions: input.desiredConditions?.trim() || null,
  });
  if (instantError) {
    return { success: false, error: '저장하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error } = await supabase.rpc('submit_planner_trust_update', {
    p_planner_profile_id: plannerProfileId,
    p_active_region_id: input.activeRegionId,
    p_career_years: input.careerYears,
    p_desired_ga_company_id: input.desiredGaCompanyId ?? null,
  });

  if (error) {
    return { success: false, error: '저장하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/planner-market');
  revalidatePath('/planner-market/my');
  revalidatePath('/admin/planner-market');
  return { success: true };
}

/** 재승인 대상(활동지역/경력/희망GA) 임시저장 - 필수값 검증 없이 작성중 내용만 보관한다. */
export async function savePlannerTrustUpdateDraftAction(
  plannerProfileId: string,
  input: { activeRegionId: string | null; careerYears: number | null; desiredGaCompanyId: string | null }
): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('save_planner_trust_update_draft', {
    p_planner_profile_id: plannerProfileId,
    p_active_region_id: input.activeRegionId,
    p_career_years: input.careerYears,
    p_desired_ga_company_id: input.desiredGaCompanyId,
  });
  if (error) {
    return { success: false, error: '임시저장하지 못했습니다.' };
  }
  revalidatePath('/planner-market/edit');
  return { success: true };
}

/** 프로필 비공개/재공개 토글 - "설계사 찾기" 목록/상세에서 즉시 반영된다. */
export async function setPlannerProfileHiddenAction(plannerProfileId: string, hidden: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_planner_profile_hidden', {
    p_planner_profile_id: plannerProfileId,
    p_hidden: hidden,
  });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }
  revalidatePath('/planner-market/my');
  revalidatePath('/planner-market');
  return { success: true };
}

/** 등록 해지 - 되돌릴 수 없는 것처럼 보이지만, 이후 재등록은 가능하다(행 자체는
 * 감사기록으로 남고 withdrawn_at만 채워짐). */
export async function withdrawPlannerProfileAction(plannerProfileId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('withdraw_planner_profile', { p_planner_profile_id: plannerProfileId });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }
  revalidatePath('/planner-market/my');
  revalidatePath('/planner-market');
  return { success: true };
}

/** 개인정보 제공 철회 - 등록 해지와 별개로, 앞으로 어떤 GA도 연락처를 새로 볼 수 없게
 * 막는다(이미 열람한 GA도 다음 조회부터 CONTACT_SHARING_REVOKED로 막힘). */
export async function revokePlannerContactSharingAction(plannerProfileId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('revoke_planner_contact_sharing', { p_planner_profile_id: plannerProfileId });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }
  revalidatePath('/planner-market/my');
  return { success: true };
}

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** 배지 신청 - 연봉 인증처럼 서류가 필요한 배지(requires_document=true)와, 향후 추가될
 * 서류 없는 self_applicable 배지 모두 이 액션 하나로 처리한다(badgeTypeCode만 다르게
 * 넘기면 됨 - 새 배지 종류가 생겨도 이 함수는 그대로 재사용). TOP설계사의 인증 신청과는
 * 완전히 별개 경로다. */
export async function submitPlannerBadgeApplicationAction(
  plannerProfileId: string,
  badgeTypeCode: string,
  formData: FormData | null
): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();

  let docPath: string | null = null;
  const file = formData?.get('file');
  if (file instanceof File && file.size > 0) {
    const extension = DOC_MIME_EXTENSIONS[file.type];
    if (!extension) {
      return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
    }
    const path = `${plannerProfileId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('planner-market-income-docs')
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) {
      return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
    }
    docPath = path;
  }

  const { error } = await supabase.rpc('submit_planner_badge_application', {
    p_planner_profile_id: plannerProfileId,
    p_badge_type_code: badgeTypeCode,
    p_doc_path: docPath,
  });
  if (error) {
    if (docPath) await createAdminClient().storage.from('planner-market-income-docs').remove([docPath]);
    const message = error.message.includes('MISSING_DOCUMENT')
      ? '증빙 서류를 선택해주세요.'
      : error.message.includes('ALREADY_APPROVED')
        ? '이미 승인된 배지입니다.'
        : '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
    return { success: false, error: message };
  }

  revalidatePath('/planner-market/my');
  revalidatePath('/admin/planner-market/badges');
  return { success: true };
}

/** 열람 알림을 모두 읽음 처리 - 알림 페이지 진입 시 호출된다. */
export async function markPlannerContactNotificationsReadAction(): Promise<void> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  await supabase.rpc('mark_my_planner_contact_notifications_read');
  revalidatePath('/planner-market/my');
  revalidatePath('/planner-market/notifications');
}

/** 설계사 상세페이지 조회 기록 - 실패해도 페이지 렌더링에 영향 없게 결과를 무시한다. */
export async function recordPlannerProfileViewAction(plannerProfileId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_planner_profile_view', { p_planner_profile_id: plannerProfileId });
}
