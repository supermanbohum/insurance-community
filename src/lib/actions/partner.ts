'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePartner } from '@/lib/partner/session';
import { slugify } from '@/lib/utils';
import { notifyAdminsOfNewBranchRegistration } from '@/lib/push/admin-alerts';
import { normalizeShortTagline, validateShortTagline } from '@/lib/branch/short-tagline';
import type { BranchMediaSource, GaOperationType } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };
export type RegisterGaResult =
  | {
      success: true;
      branchId: string;
      registrationId: string;
      /**
       * 지점은 등록됐지만 「짧은 소개」만 저장하지 못한 경우 true.
       *
       * 🔴 지점 등록 자체를 실패로 만들지 않는다 - 사진·서류까지 다 올린 등록을 선택
       * 입력 한 칸 때문에 되돌리면 사용자가 처음부터 다시 해야 한다. 대신 **조용히
       * 버리지도 않는다**: 호출부가 이 값을 보고 "짧은 소개만 저장 못 했다"고 알린다.
       */
      shortTaglineFailed?: boolean;
      /**
       * 「등록자 연락처를 지점 연락처로 공개」에 체크했는데 그 저장만 실패한 경우 true.
       * shortTaglineFailed와 같은 이유로 등록 자체는 살리고, 조용히 버리지도 않는다.
       */
      registrantPhoneShareFailed?: boolean;
    }
  | { success: false; error: string };

/**
 * 「짧은 소개」를 지점에 저장한다(0108의 전용 RPC).
 *
 * 왜 등록 RPC에 인자로 안 넣었나: `submit_branch_registration`에 파라미터를 더하면
 * 시그니처가 다른 함수가 하나 더 생겨(옛 함수는 남는다) PostgREST가 후보를 못 고르거나,
 * 옛 함수를 지우면 SQL 적용~배포 사이에 등록 폼이 죽는다. 0108 헤더에 자세히 적었다.
 *
 * 반환값은 "저장됐는가"다. 실패해도 던지지 않는다 - 호출부가 등록 자체를 살린 채
 * 이 값만 보고 안내하도록.
 */
async function saveShortTagline(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  branchId: string,
  raw: string | null | undefined
): Promise<boolean> {
  const value = normalizeShortTagline(raw);
  if (value === null) return true; // 미입력 - 저장할 것이 없다(빈 값으로 덮어쓸 필요도 없다)
  if (validateShortTagline(value) !== null) return false;

  const { error } = await supabase.rpc('set_branch_short_tagline', {
    p_branch_id: branchId,
    p_short_tagline: value,
  });
  return !error;
}

/**
 * 직영/지사 구분을 지점에 저장한다(기존 `set_branch_operation_type` RPC).
 *
 * 왜 등록 RPC에 인자로 안 넣었나: `submit_branch_registration`에 파라미터를 더하면
 * 시그니처가 다른 함수가 하나 더 생겨(옛 함수는 남는다) PostgREST가 후보를 못 고르거나,
 * 옛 함수를 지우면 SQL 적용~배포 사이에 등록 폼이 죽는다. 0108 헤더에 자세히 적었다.
 * 🔴 그리고 이 RPC는 **이미 DB에 있었다** - 호출부가 0건이었을 뿐이다. 새로 만들지 않았다.
 *
 * 지점이 만들어진 다음에 선택값으로 저장한다 - branch_id가 있어야 하기 때문이다.
 * 'branch'는 DB 기본값과 같아 호출 자체를 건너뛴다.
 *
 * 반환값은 "저장됐는가"다. 실패해도 던지지 않는다 - 호출부가 등록 자체를 살린 채
 * 이 값만 보고 안내하도록.
 */
async function saveOperationType(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  branchId: string,
  operationType: GaOperationType | undefined
): Promise<boolean> {
  // 기본값이 'branch'라 같은 값이면 쓸 일이 없다.
  if (!operationType || operationType === 'branch') return true;
  const { error } = await supabase.rpc('set_branch_operation_type', {
    p_branch_id: branchId,
    p_operation_type: operationType,
  });
  return !error;
}

/**
 * 직영/지사를 **즉시** 바꾼다(오너 지시 2026-08-13).
 *
 * 🔴 승인 큐를 타지 않는다. 잘못 고른 지점이 있을 수 있으니 지점 수정에서 언제든
 * 바꿀 수 있어야 하고, 그 변경은 관리자 승인 없이 바로 반영된다.
 *
 * ⚠️ 다른 수정 항목과 저장 버튼을 공유하지 않는다. 이 값만 승인 없이 즉시 반영되므로,
 * 같은 버튼에 묶으면 "저장했는데 어떤 건 반영되고 어떤 건 대기"가 되어 설명할 수 없다.
 *
 * 🔴 심사 상태를 보지 않는 것은 RPC 쪽(0110)이다. 그 마이그레이션이 적용되기 전에는
 * 승인된 지점에서 REQUIRES_REVIEW가 올라온다 - 그때도 조용히 실패하지 않도록
 * 호출부가 에러를 그대로 보여준다.
 */
export async function setBranchOperationTypeAction(
  branchId: string,
  operationType: GaOperationType
): Promise<ActionResult> {
  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();

  const { data: branch } = await supabase
    .from('ga_branch')
    .select('id, slug, ga_company_id')
    .eq('id', branchId)
    .maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const { error } = await supabase.rpc('set_branch_operation_type', {
    p_branch_id: branchId,
    p_operation_type: operationType,
  });
  if (error) {
    return { success: false, error: '변경하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  // 즉시 반영이므로 공개 화면 캐시도 함께 무효화한다 - 지점 상세·검색·지도가 이 값을
  // 배지와 마커 색으로 쓴다.
  revalidatePath('/partner');
  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath(`/branch/${branch.slug}`);
  revalidatePath('/search');
  revalidatePath('/map');
  return { success: true };
}

/**
 * 등록자 본인 연락처를 **지점의 공개 연락처로** 올린다(오너 지시 2026-08-13:
 * "지점등록하면 연락처 등록 여부 체크 넣고, 체크하면 공개해").
 *
 * 🔴 여기 들어가는 번호는 **회사 대표번호가 아니라 지점관리자 본인 번호**다
 * (`branch_registrations.registrant_phone`). 개인 휴대폰이 공개되는 일이므로
 * **체크했을 때만** 호출한다 - 기본값은 미체크이고, 폼 문구에 "공개됩니다"를 명시했다.
 *
 * 왜 DB 스키마를 안 건드렸나: 공개 연락처는 이미 `branch_contacts`가 정본이고
 * `upsert_branch_contact` RPC를 파트너가 부를 수 있다(submitBranchChangeAction이 같은
 * 경로를 쓴다). 등록 RPC에 파라미터를 더하면 시그니처가 다른 함수가 하나 더 생겨
 * PostgREST가 후보를 못 고르는 문제가 생긴다(0108 헤더 참고) - 그 위험을 지지 않는다.
 *
 * 반환값은 "저장됐는가"다. 실패해도 던지지 않는다.
 */
async function savePublicRegistrantPhone(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  branchId: string,
  phone: string
): Promise<boolean> {
  const value = phone.trim();
  if (!value) return false;
  const { error } = await supabase.rpc('upsert_branch_contact', {
    p_contact_id: null,
    p_branch_id: branchId,
    p_type: 'phone',
    p_value: value,
    p_sort_order: 0,
  });
  return !error;
}

function uniqueSlug(name: string, seed: string): string {
  return `${slugify(name) || 'branch'}-${seed.replace(/-/g, '').slice(-8)}`;
}

/** 가입 직후 소속 GA를 선택하고 첫 지점을 등록 - branch_registrations 큐에 올라가고
 * 관리자 승인 전까지 항상 비공개다(등록자 정보/서류 확인 후 승인, 0022 참고).
 * 보험맵은 GA를 새로 만드는 사이트가 아니라 지점을 찾는 플랫폼이므로, GA는 항상
 * 정해진 목록(listGaFilterOptions) 중에서 고른다 - 이미 DB에 있는 GA면 그 회사에
 * 지점을 붙이고, 마스터 목록에만 있던 이름이면 그 이름으로 회사 행을 이번에 처음 만든다. */
export async function submitBranchRegistrationAction(input: {
  gaName: string;
  registrant: {
    name: string;
    title: string;
    phone: string;
    company: string;
    branchLabel: string;
  };
  /** 등록자 본인 연락처를 지점 공개 연락처로 올릴지(오너 지시 2026-08-13).
   * 기본은 **미공개**다 - 호출부가 명시적으로 true를 넘겨야 공개된다. */
  publishRegistrantPhone?: boolean;
  branch: {
    name: string;
    regionId: string | null;
    managerName?: string;
    address: string;
    addressDetail?: string;
    lat?: number | null;
    lng?: number | null;
    introText?: string;
    tagline?: string;
    /** 지점명 오른쪽에 붙는 짧은 소개(0107). tagline과 다른 문구다 - 자른 것이 아니다. */
    shortTagline?: string;
    /** 직영/지사(오너 지시 2026-08-13). 미지정이면 DB 기본값 'branch'가 그대로 남는다. */
    operationType?: GaOperationType;
    plannerCount?: number | null;
    parkingAvailable?: boolean | null;
    visitConsultAvailable?: boolean | null;
    newRecruitTraining?: boolean | null;
    experiencedHire?: boolean | null;
    dbSupport?: boolean | null;
    settlementSupport?: boolean | null;
  };
}): Promise<RegisterGaResult> {
  if (!input.gaName.trim() || !input.branch.name.trim() || !input.branch.address.trim()) {
    return { success: false, error: 'GA, 지점명, 주소는 필수입니다.' };
  }
  const { name, title, phone, company, branchLabel } = input.registrant;
  if (!name.trim() || !title.trim() || !phone.trim() || !company.trim() || !branchLabel.trim()) {
    return { success: false, error: '등록자 정보를 모두 입력해주세요.' };
  }

  const partner = await requirePartner();
  // 🔴 예전에는 여기서 「이미 등록된 지점이 있습니다」로 막았다 — **계정당 지점 하나**였다.
  //    컴패니언처럼 사무실이 10곳인 곳은 두 번째부터 못 올려서 운영팀이 대신 만들어야 했다.
  //    0119부터 RPC가 **자기 회사에 한해** 추가 등록을 허용한다(다른 GA 이름이면 GA_NAME_MISMATCH).
  //    판정은 RPC 한 곳에서만 한다 — 여기서 또 막으면 판정이 두 군데가 된다(2026-08-24 사고).

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc('submit_branch_registration', {
      p_ga_name: input.gaName.trim(),
      p_branch_slug: uniqueSlug(input.branch.name, partner.id),
      p_branch_name: input.branch.name.trim(),
      p_region_id: input.branch.regionId,
      p_manager_name: input.branch.managerName?.trim() ?? null,
      p_address: input.branch.address.trim(),
      p_address_detail: input.branch.addressDetail?.trim() ?? null,
      p_registrant_name: name.trim(),
      p_registrant_title: title.trim(),
      p_registrant_phone: phone.trim(),
      p_registrant_company: company.trim(),
      p_registrant_branch_label: branchLabel.trim(),
      p_intro_text: input.branch.introText?.trim() ?? null,
      p_planner_count: input.branch.plannerCount ?? null,
      p_parking_available: input.branch.parkingAvailable ?? null,
      p_visit_consult_available: input.branch.visitConsultAvailable ?? null,
      p_business_hours: null,
      p_lat: input.branch.lat ?? null,
      p_lng: input.branch.lng ?? null,
      p_tagline: input.branch.tagline?.trim() ?? null,
      p_new_recruit_training: input.branch.newRecruitTraining ?? null,
      p_experienced_hire: input.branch.experiencedHire ?? null,
      p_db_support: input.branch.dbSupport ?? null,
      p_settlement_support: input.branch.settlementSupport ?? null,
    })
    .single();

  if (error || !data) {
    // 분기 코드는 0119 정의에 실제로 있는 것만 쓴다
    const m = error?.message ?? '';
    if (m.includes('GA_NAME_MISMATCH')) {
      return { success: false, error: '이미 다른 GA에 소속된 계정입니다. 같은 GA 이름으로만 지점을 추가할 수 있습니다.' };
    }
    if (m.includes('MISSING_REGISTRANT_INFO')) {
      return { success: false, error: '등록자 정보를 모두 입력해주세요.' };
    }
    return { success: false, error: '지점 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  // 지점이 만들어진 다음에 저장한다 - branch_id가 있어야 하고, submit_branch_registration이
  // ga_admin_users.branch_id를 방금 채웠으므로 RPC의 소유자 확인을 통과한다.
  const shortTaglineSaved = await saveShortTagline(supabase, data.branch_id, input.branch.shortTagline);
  await saveOperationType(supabase, data.branch_id, input.branch.operationType);
  // 체크하지 않았으면 아무것도 하지 않는다 - 개인 휴대폰이라 기본은 미공개다.
  const phoneShared = input.publishRegistrantPhone
    ? await savePublicRegistrantPhone(supabase, data.branch_id, phone)
    : true;

  await supabase.rpc('clear_branch_registration_draft');

  revalidatePath('/partner');
  revalidatePath('/admin/change-requests');
  await notifyAdminsOfNewBranchRegistration();
  return {
    success: true,
    branchId: data.branch_id,
    registrationId: data.registration_id,
    shortTaglineFailed: !shortTaglineSaved,
    registrantPhoneShareFailed: !phoneShared,
  };
}

/** W-087③ - 사진 없이 지점 등록을 저장한다. status='incomplete'라 승인 대기열에는
 * 안 잡힌다(review_branch_registration은 절대 손대지 않았다 - 사진 요건은 그대로).
 * OnboardingForm.tsx의 ALLOW_INCOMPLETE_SUBMIT 상수로 UI 노출이 꺼져 있어 오너 확인
 * 전에는 이 경로를 탈 방법이 없다. */
export async function saveIncompleteBranchRegistrationAction(input: {
  gaName: string;
  registrant: {
    name: string;
    title: string;
    phone: string;
    company: string;
    branchLabel: string;
  };
  branch: {
    name: string;
    regionId: string | null;
    managerName?: string;
    address: string;
    addressDetail?: string;
    lat?: number | null;
    lng?: number | null;
    introText?: string;
    tagline?: string;
    /** 지점명 오른쪽에 붙는 짧은 소개(0107). tagline과 다른 문구다 - 자른 것이 아니다. */
    shortTagline?: string;
    /** 직영/지사(오너 지시 2026-08-13). 미지정이면 DB 기본값 'branch'가 그대로 남는다. */
    operationType?: GaOperationType;
    plannerCount?: number | null;
    parkingAvailable?: boolean | null;
    visitConsultAvailable?: boolean | null;
    newRecruitTraining?: boolean | null;
    experiencedHire?: boolean | null;
    dbSupport?: boolean | null;
    settlementSupport?: boolean | null;
  };
}): Promise<RegisterGaResult> {
  if (!input.gaName.trim() || !input.branch.name.trim() || !input.branch.address.trim()) {
    return { success: false, error: 'GA, 지점명, 주소는 필수입니다.' };
  }
  const { name, title, phone, company, branchLabel } = input.registrant;
  if (!name.trim() || !title.trim() || !phone.trim() || !company.trim() || !branchLabel.trim()) {
    return { success: false, error: '등록자 정보를 모두 입력해주세요.' };
  }

  const partner = await requirePartner();
  // 🔴 예전에는 여기서 「이미 등록된 지점이 있습니다」로 막았다 — **계정당 지점 하나**였다.
  //    컴패니언처럼 사무실이 10곳인 곳은 두 번째부터 못 올려서 운영팀이 대신 만들어야 했다.
  //    0119부터 RPC가 **자기 회사에 한해** 추가 등록을 허용한다(다른 GA 이름이면 GA_NAME_MISMATCH).
  //    판정은 RPC 한 곳에서만 한다 — 여기서 또 막으면 판정이 두 군데가 된다(2026-08-24 사고).

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc('submit_branch_registration_incomplete', {
      p_ga_name: input.gaName.trim(),
      p_branch_slug: uniqueSlug(input.branch.name, partner.id),
      p_branch_name: input.branch.name.trim(),
      p_region_id: input.branch.regionId,
      p_manager_name: input.branch.managerName?.trim() ?? null,
      p_address: input.branch.address.trim(),
      p_address_detail: input.branch.addressDetail?.trim() ?? null,
      p_registrant_name: name.trim(),
      p_registrant_title: title.trim(),
      p_registrant_phone: phone.trim(),
      p_registrant_company: company.trim(),
      p_registrant_branch_label: branchLabel.trim(),
      p_intro_text: input.branch.introText?.trim() ?? null,
      p_planner_count: input.branch.plannerCount ?? null,
      p_parking_available: input.branch.parkingAvailable ?? null,
      p_visit_consult_available: input.branch.visitConsultAvailable ?? null,
      p_business_hours: null,
      p_lat: input.branch.lat ?? null,
      p_lng: input.branch.lng ?? null,
      p_tagline: input.branch.tagline?.trim() ?? null,
      p_new_recruit_training: input.branch.newRecruitTraining ?? null,
      p_experienced_hire: input.branch.experiencedHire ?? null,
      p_db_support: input.branch.dbSupport ?? null,
      p_settlement_support: input.branch.settlementSupport ?? null,
    })
    .single();

  if (error || !data) {
    // 분기 코드는 0119 정의에 실제로 있는 것만 쓴다
    const m = error?.message ?? '';
    if (m.includes('GA_NAME_MISMATCH')) {
      return { success: false, error: '이미 다른 GA에 소속된 계정입니다. 같은 GA 이름으로만 지점을 추가할 수 있습니다.' };
    }
    if (m.includes('MISSING_REGISTRANT_INFO')) {
      return { success: false, error: '등록자 정보를 모두 입력해주세요.' };
    }
    return { success: false, error: '지점 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const shortTaglineSaved = await saveShortTagline(supabase, data.branch_id, input.branch.shortTagline);
  await saveOperationType(supabase, data.branch_id, input.branch.operationType);

  await supabase.rpc('clear_branch_registration_draft');
  revalidatePath('/partner');
  return {
    success: true,
    branchId: data.branch_id,
    registrationId: data.registration_id,
    shortTaglineFailed: !shortTaglineSaved,
  };
}

/** W-087③ - 미완성 등록에 사진을 마저 올린 뒤 호출해 실제 승인 대기열('pending')로
 * 전환한다. 사진/서류가 부족하면 RPC가 그대로 거부한다(review_branch_registration과
 * 동일 기준). */
export async function completeBranchRegistrationAction(registrationId: string): Promise<ActionResult> {
  await requirePartner();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('complete_branch_registration', { p_registration_id: registrationId });
  if (error) {
    const message = error.message.includes('MISSING_MAIN_PHOTO')
      ? '대표사진을 등록해주세요.'
      : error.message.includes('MISSING_OFFICE_PHOTOS')
        ? '사무실 사진을 3장 이상 등록해주세요.'
        : error.message.includes('MISSING_REQUIRED_DOCUMENTS')
          ? '임대차계약서와 명함을 등록해주세요.'
          : error.message.includes('INTRO_TEXT_TOO_SHORT')
            ? '지점 소개글을 50자 이상 입력해주세요.'
            : '완료 처리하지 못했습니다.';
    return { success: false, error: message };
  }
  revalidatePath('/partner');
  revalidatePath('/admin/change-requests');
  await notifyAdminsOfNewBranchRegistration();
  return { success: true };
}

/** 신규 지점 등록 폼 임시저장 - ga_company/ga_branch를 전혀 만들지 않고 입력값만
 * jsonb로 보관한다(파일 제외). 폼이 마운트될 때 이 값을 불러와 "이어서 작성"한다. */
export async function saveBranchRegistrationDraftAction(payload: Record<string, unknown>): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('save_branch_registration_draft', { p_payload: payload });
  if (error) {
    return { success: false, error: '임시저장하지 못했습니다.' };
  }
  return { success: true };
}

export async function getMyBranchRegistrationDraftAction(): Promise<Record<string, unknown> | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('get_my_branch_registration_draft');
  return (data as Record<string, unknown> | null) ?? null;
}

export type IncompleteRegistrationSummary = {
  registrationId: string;
  branchId: string;
  branchName: string;
  hasMainPhoto: boolean;
  officePhotoCount: number;
};

/** W-087④ - 사진 없이 저장된(status='incomplete') 내 등록을 찾는다. /partner
 * 대시보드의 "이어서 작성" 카드와 /partner/register/continue 페이지가 이 값으로
 * 무엇이 남았는지 구체적으로 보여준다. */
export async function getMyIncompleteBranchRegistrationAction(): Promise<IncompleteRegistrationSummary | null> {
  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();

  const { data: registration } = await supabase
    .from('branch_registrations')
    .select('id, branch_id')
    .eq('submitted_by_ga_admin_id', partner.id)
    .eq('status', 'incomplete')
    .maybeSingle();
  if (!registration || !registration.branch_id) return null;

  const [{ data: branch }, { data: media }] = await Promise.all([
    supabase.from('ga_branch').select('name').eq('id', registration.branch_id).maybeSingle(),
    supabase.from('branch_media').select('media_type').eq('branch_id', registration.branch_id).in('media_type', ['image_main', 'image_office']),
  ]);

  return {
    registrationId: registration.id,
    branchId: registration.branch_id,
    branchName: branch?.name ?? '',
    hasMainPhoto: (media ?? []).some((m) => m.media_type === 'image_main'),
    officePhotoCount: (media ?? []).filter((m) => m.media_type === 'image_office').length,
  };
}

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** 임대차계약서/명함 업로드 - 비공개 버킷에 저장 후 branch_registrations에 경로만 연결한다.
 * 둘 다 등록되어야 관리자가 승인할 수 있다(review_branch_registration의 서류 확인 참고). */
export async function uploadRegistrationDocumentAction(
  registrationId: string,
  docType: 'lease_contract' | 'business_card',
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }

  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: registration } = await supabase
    .from('branch_registrations')
    .select('id, branch_id, submitted_by_ga_admin_id')
    .eq('id', registrationId)
    .maybeSingle();
  if (!registration || registration.submitted_by_ga_admin_id !== partner.id || !registration.branch_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const path = `${registration.branch_id}/${registrationId}/${docType}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('branch-verification-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error: attachError } = await supabase.rpc('attach_registration_document', {
    p_registration_id: registrationId,
    p_doc_type: docType,
    p_path: path,
  });
  if (attachError) {
    await createAdminClient().storage.from('branch-verification-docs').remove([path]);
    return { success: false, error: '등록하지 못했습니다.' };
  }

  return { success: true };
}

/** GA 기본 정보(이름/대표자/소개) 수정 - 본인 소속 GA만, 즉시 반영. */
export async function updateGaCompanyProfileAction(input: {
  name: string;
  ceoName?: string;
  description?: string;
}): Promise<ActionResult> {
  if (!input.name.trim()) {
    return { success: false, error: 'GA명을 입력해주세요.' };
  }

  const partner = await requirePartner();
  if (!partner.ga_company_id) {
    return { success: false, error: '등록된 GA가 없습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_partner_ga_company', {
    p_name: input.name.trim(),
    p_ceo_name: input.ceoName?.trim() ?? null,
    p_description: input.description?.trim() ?? null,
  });

  if (error) {
    return { success: false, error: '저장하지 못했습니다.' };
  }

  revalidatePath('/partner/company');
  revalidatePath('/');
  revalidatePath('/search');
  return { success: true };
}

/** 지점 정보 수정(원수사 + 연락처 + 채용) - 신뢰도에 영향이 적은 항목이라 본인 소속
 * 지점만, 즉시 반영된다. 이름/주소/소개글/사진처럼 신뢰도 항목은 submitBranchTrustUpdateAction으로
 * 분리되어 관리자 승인을 거친다(사용자 확인: 연락처/채용/취급보험사는 매번 승인 대기하면
 * 파트너 불편이 커서 즉시 반영 유지). */
export async function submitBranchChangeAction(
  branchId: string,
  input: {
    insurers?: { insurerIds: string[] };
    contacts?: { phone?: string; kakao?: string; homepage?: string };
    recruit?: { action: 'open'; title: string; content: string } | { action: 'close' };
  }
): Promise<ActionResult> {
  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();

  const { data: branch } = await supabase.from('ga_branch').select('id, slug, ga_company_id, region_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }
  // 🔴 여기서 `partner.branch_id !== branchId`로 직접 비교하면 안 된다.
  //    판정이 두 군데가 되면 반드시 어긋난다 — 실제로 어긋났다(2026-08-24):
  //    이 검사는 통과 못 시키고, 페이지 가드는 회사 단위라 폼은 열려서
  //    「되는 화면인데 버튼만 죽은」 상태가 됐다.
  //    저장 RPC들이 쓰는 is_ga_admin_for_branch를 그대로 물어본다(0115의 위임까지 본다).
  const { data: canManage } = await supabase.rpc('is_ga_admin_for_branch', { p_branch_id: branchId });
  if (!canManage) {
    return {
      success: false,
      error: '이 지점을 관리할 권한이 없습니다. 운영팀에 지점 관리자 등록을 요청해주세요.',
    };
  }

  if (input.insurers) {
    await supabase.rpc('set_branch_insurers', { p_branch_id: branchId, p_insurer_ids: input.insurers.insurerIds });
  }

  if (input.contacts) {
    const { data: existingContacts } = await supabase.from('branch_contacts').select('id, type').eq('branch_id', branchId);
    const byType = new Map((existingContacts ?? []).map((c) => [c.type, c.id]));

    for (const [type, value] of Object.entries(input.contacts) as [string, string | undefined][]) {
      const trimmed = value?.trim();
      const existingId = byType.get(type) ?? null;
      if (trimmed) {
        await supabase.rpc('upsert_branch_contact', {
          p_contact_id: existingId,
          p_branch_id: branchId,
          p_type: type,
          p_value: trimmed,
          p_sort_order: 0,
        });
      } else if (existingId) {
        await supabase.rpc('delete_branch_contact', { p_contact_id: existingId });
      }
    }
  }

  if (input.recruit) {
    const { data: recruits } = await supabase.from('branch_recruit').select('id, is_active').eq('branch_id', branchId);
    const active = (recruits ?? []).find((r) => r.is_active);

    if (input.recruit.action === 'open') {
      if (active) {
        await supabase.rpc('update_branch_recruit', {
          p_recruit_id: active.id,
          p_title: input.recruit.title,
          p_content: input.recruit.content,
        });
      } else {
        // 🔴 RPC 에러를 버리지 마라. 여기서 삼켜서 「저장되었습니다」가 뜨는데
        //    실제로는 400 이 나던 것이 2026-08-27 사고의 원인이다.
        const { error: recruitError } = await supabase.rpc('create_branch_recruit', {
          p_branch_id: branchId,
          p_title: input.recruit.title,
          p_content: input.recruit.content,
        });
        if (recruitError) {
          const m = recruitError.message ?? '';
          // create_branch_recruit 가 던지는 것: NOT_AUTHORIZED_FOR_BRANCH / INVALID_INPUT (pg_proc 확인)
          if (m.includes('INVALID_INPUT')) {
            return { success: false, error: '채용 공고의 제목과 내용을 모두 입력해주세요.' };
          }
          if (m.includes('NOT_AUTHORIZED_FOR_BRANCH')) {
            return { success: false, error: '이 지점을 관리할 권한이 없습니다. 운영팀에 지점 관리자 등록을 요청해주세요.' };
          }
          return { success: false, error: '채용 정보를 저장하지 못했습니다.' };
        }
      }
    } else if (active) {
      await supabase.rpc('close_branch_recruit', { p_recruit_id: active.id });
    }
  }

  revalidatePath('/partner/branches');
  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath(`/branch/${branch.slug}`);
  revalidatePath('/');
  revalidatePath('/search');
  return { success: true };
}

export type SubmitTrustUpdateResult = { success: true; registrationId: string } | { success: false; error: string };

export interface BranchTrustPayload {
  name: string;
  regionId?: string | null;
  address: string;
  addressDetail?: string;
  introText?: string;
  educationInfo?: string;
  welfareInfo?: string;
  dbSupportInfo?: string;
  settlementSupportInfo?: string;
  plannerCount?: number | null;
  parkingAvailable?: boolean;
  visitConsultAvailable?: boolean;
  businessHours?: string;
  /**
   * 짧은 소개(0107). 🔴 승인 큐를 탄다 - 즉시 반영되지 않는다.
   * 빈 문자열은 "지운다"는 뜻이라 undefined와 구분해서 그대로 넘긴다.
   */
  shortTagline?: string;
}

/** 임시저장 - 작성중 내용을 draft로 보관한다(필수값 검증 없음). 이미 대기중인 요청이
 * 있으면 그 요청의 내용만 갱신되고 상태는 대기중 그대로 유지된다. */
export async function saveBranchUpdateDraftAction(
  branchId: string,
  registrant: { name: string; title: string; phone: string; company: string; branchLabel: string },
  payload: Partial<BranchTrustPayload>
): Promise<ActionResult> {
  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: branch } = await supabase.from('ga_branch').select('id, ga_company_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const { error } = await supabase.rpc('save_branch_update_draft', {
    p_branch_id: branchId,
    p_registrant_name: registrant.name.trim() || null,
    p_registrant_title: registrant.title.trim() || null,
    p_registrant_phone: registrant.phone.trim() || null,
    p_registrant_company: registrant.company.trim() || null,
    p_registrant_branch_label: registrant.branchLabel.trim() || null,
    p_payload: {
      name: payload.name?.trim() ?? undefined,
      regionId: payload.regionId ?? undefined,
      address: payload.address?.trim() ?? undefined,
      addressDetail: payload.addressDetail?.trim() ?? undefined,
      introText: payload.introText?.trim() ?? undefined,
      educationInfo: payload.educationInfo?.trim() ?? undefined,
      welfareInfo: payload.welfareInfo?.trim() ?? undefined,
      dbSupportInfo: payload.dbSupportInfo?.trim() ?? undefined,
      settlementSupportInfo: payload.settlementSupportInfo?.trim() ?? undefined,
      plannerCount: payload.plannerCount ?? undefined,
      parkingAvailable: payload.parkingAvailable ?? undefined,
      visitConsultAvailable: payload.visitConsultAvailable ?? undefined,
      businessHours: payload.businessHours?.trim() ?? undefined,
      // 🔴 `?? undefined`가 아니라 `!== undefined` 검사다. 빈 문자열을 undefined로
      // 접으면 "지운다"가 "안 바꾼다"가 되어 짧은 소개를 영영 못 지운다.
      ...(payload.shortTagline !== undefined ? { shortTagline: payload.shortTagline.trim() } : {}),
    },
  });
  if (error) {
    return { success: false, error: '임시저장하지 못했습니다.' };
  }

  revalidatePath(`/partner/branches/${branchId}`);
  return { success: true };
}

/** 지점 신뢰도 항목(이름/주소/지역/소개글류/설계사수/편의시설) 수정 - 즉시 반영되지 않고
 * branch_registrations 큐에 적재되어 관리자 승인 후에만 실제 지점 데이터에 반영된다. */
export async function submitBranchTrustUpdateAction(
  branchId: string,
  registrant: { name: string; title: string; phone: string; company: string; branchLabel: string },
  payload: {
    name: string;
    regionId?: string | null;
    address: string;
    addressDetail?: string;
    introText?: string;
    educationInfo?: string;
    welfareInfo?: string;
    dbSupportInfo?: string;
    settlementSupportInfo?: string;
    plannerCount?: number | null;
    parkingAvailable?: boolean;
    visitConsultAvailable?: boolean;
    businessHours?: string;
    /**
     * 짧은 소개(0107). 🔴 승인 큐를 탄다 - 즉시 반영되지 않는다.
     * 빈 문자열은 "지운다"는 뜻이라 undefined와 구분해서 그대로 넘긴다.
     */
    shortTagline?: string;
  }
): Promise<SubmitTrustUpdateResult> {
  const { name, title, phone, company, branchLabel } = registrant;
  if (!name.trim() || !title.trim() || !phone.trim() || !company.trim() || !branchLabel.trim()) {
    return { success: false, error: '등록자 정보를 모두 입력해주세요.' };
  }
  if (!payload.name.trim() || !payload.address.trim()) {
    return { success: false, error: '지점명과 주소는 필수입니다.' };
  }

  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: branch } = await supabase.from('ga_branch').select('id, slug, ga_company_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const { data: registrationId, error } = await supabase.rpc('submit_branch_update', {
    p_branch_id: branchId,
    p_registrant_name: name.trim(),
    p_registrant_title: title.trim(),
    p_registrant_phone: phone.trim(),
    p_registrant_company: company.trim(),
    p_registrant_branch_label: branchLabel.trim(),
    p_payload: {
      name: payload.name.trim(),
      regionId: payload.regionId ?? undefined,
      address: payload.address.trim(),
      addressDetail: payload.addressDetail?.trim() ?? undefined,
      introText: payload.introText?.trim() ?? undefined,
      educationInfo: payload.educationInfo?.trim() ?? undefined,
      welfareInfo: payload.welfareInfo?.trim() ?? undefined,
      dbSupportInfo: payload.dbSupportInfo?.trim() ?? undefined,
      settlementSupportInfo: payload.settlementSupportInfo?.trim() ?? undefined,
      plannerCount: payload.plannerCount ?? undefined,
      parkingAvailable: payload.parkingAvailable ?? undefined,
      visitConsultAvailable: payload.visitConsultAvailable ?? undefined,
      businessHours: payload.businessHours?.trim() ?? undefined,
      // 🔴 `?? undefined`가 아니라 `!== undefined` 검사다. 빈 문자열을 undefined로
      // 접으면 "지운다"가 "안 바꾼다"가 되어 짧은 소개를 영영 못 지운다.
      ...(payload.shortTagline !== undefined ? { shortTagline: payload.shortTagline.trim() } : {}),
    },
  });
  if (error || !registrationId) {
    // 🔴 권한 실패를 「잠시 후 다시 시도」로 뭉뚱그리지 않는다.
    //    실제 사고(2026-08-24): 권한 문제인데 이 문구가 나와서 지점 관리자가
    //    몇 번이고 다시 눌렀고, 원인을 찾는 데 하루가 걸렸다. 재시도해도 안 되는 건 그렇게 말한다.
    // 코드는 pg_proc에서 실제로 확인한 것만 분기한다.
    // submit_branch_update가 던지는 것: NOT_GA_ADMIN_FOR_BRANCH / MISSING_REGISTRANT_INFO / EMPTY_PAYLOAD
    const m = error?.message ?? '';
    if (m.includes('NOT_GA_ADMIN_FOR_BRANCH')) {
      return {
        success: false,
        error: '이 지점을 관리할 권한이 없습니다. 운영팀에 지점 관리자 등록을 요청해주세요.',
      };
    }
    if (m.includes('MISSING_REGISTRANT_INFO')) {
      return { success: false, error: '신청자 정보(성함·직책·연락처·소속)를 모두 입력해주세요.' };
    }
    if (m.includes('EMPTY_PAYLOAD')) {
      return { success: false, error: '변경된 내용이 없습니다.' };
    }
    return { success: false, error: '제출하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/partner');
  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath('/admin/change-requests');
  return { success: true, registrationId };
}

/** 승인 대기 중인 지점 수정 요청에 딸린 새 사진 업로드 - 기존 add_branch_media 파이프라인을
 * 그대로 쓰되, 업로드 직후 pending_registration_id를 채워 승인 전까지 공개 조회에서
 * 제외시킨다(0022의 RLS 정책, 0026의 set_media_pending_registration 참고). */
export async function uploadPendingBranchPhotoAction(
  branchId: string,
  registrationId: string,
  formData: FormData,
  isMain: boolean
): Promise<ActionResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: '이미지는 최대 8MB까지 업로드할 수 있습니다.' };
  }

  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: branch } = await supabase.from('ga_branch').select('id, slug, ga_company_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const path = `${branch.ga_company_id}/${branchId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('branch-images')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { data: mediaId, error: registerError } = await supabase.rpc('add_branch_media', {
    p_branch_id: branchId,
    p_media_type: isMain ? 'image_main' : 'image_office',
    p_source: 'storage' as BranchMediaSource,
    p_value: path,
    p_sort_order: 0,
  });
  if (registerError || !mediaId) {
    await createAdminClient().storage.from('branch-images').remove([path]);
    // 🔴 권한 실패를 「이미 대표사진이 있어…」로 말하면 안 된다 — 원인이 아닌 걸 원인이라고 하는 것이다.
    //    add_branch_media가 던지는 것: NOT_AUTHORIZED_FOR_BRANCH / INVALID_INPUT (pg_proc 확인)
    if (registerError?.message?.includes('NOT_AUTHORIZED_FOR_BRANCH')) {
      return {
        success: false,
        error: '이 지점을 관리할 권한이 없습니다. 운영팀에 지점 관리자 등록을 요청해주세요.',
      };
    }
    return { success: false, error: isMain ? '이미 대표사진이 있어 승인 대기 중인 지점만 새 대표사진을 추가할 수 있습니다.' : '등록하지 못했습니다.' };
  }

  const { error: pendingError } = await supabase.rpc('set_media_pending_registration', {
    p_media_id: mediaId,
    p_registration_id: registrationId,
  });
  if (pendingError) {
    await createAdminClient().storage.from('branch-images').remove([path]);
    await supabase.rpc('delete_branch_media', { p_media_id: mediaId });
    return { success: false, error: '등록하지 못했습니다.' };
  }

  return { success: true };
}

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** 지점 등록 시 사무실 사진 업로드(최소 3장) - add_branch_media RPC가 해당 지점에 이미지가
 * 하나도 없으면 자동으로 대표사진(image_main)으로, 있으면 나머지 사진(image_office)으로
 * 저장한다(첫 업로드 = 대표사진 정책). isMain/sortOrder 인자는 더 이상 서버 판단에 쓰이지
 * 않지만(RPC가 실제 업로드 순서로 재계산) 호출부 호환을 위해 그대로 남겨둔다.
 * 등록 직후(register_branch_for_partner 성공 직후) 반복 호출한다. */
export async function uploadPartnerBranchPhotoAction(
  branchId: string,
  formData: FormData,
  isMain: boolean,
  sortOrder: number
): Promise<ActionResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: '이미지는 최대 8MB까지 업로드할 수 있습니다.' };
  }

  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: branch } = await supabase.from('ga_branch').select('id, slug, ga_company_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const path = `${branch.ga_company_id}/${branchId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('branch-images')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error: registerError } = await supabase.rpc('add_branch_media', {
    p_branch_id: branchId,
    p_media_type: isMain ? 'image_main' : 'image_office',
    p_source: 'storage' as BranchMediaSource,
    p_value: path,
    p_sort_order: sortOrder,
  });
  if (registerError) {
    await createAdminClient().storage.from('branch-images').remove([path]);
    return { success: false, error: '등록하지 못했습니다.' };
  }

  revalidatePath(`/branch/${branch.slug}`);
  revalidatePath('/');
  return { success: true };
}

const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** 홍보 영상 업로드(선택, 최대 1개) - branch_media에 media_type='video'로 등록한다. */
export async function uploadPartnerBranchVideoAction(branchId: string, formData: FormData): Promise<ActionResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }
  const extension = VIDEO_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'mp4, mov, webm 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 200 * 1024 * 1024) {
    return { success: false, error: '영상은 최대 200MB까지 업로드할 수 있습니다.' };
  }

  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: branch } = await supabase.from('ga_branch').select('id, slug, ga_company_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const path = `${branch.ga_company_id}/${branchId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('branch-videos')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error: registerError } = await supabase.rpc('add_branch_media', {
    p_branch_id: branchId,
    p_media_type: 'video',
    p_source: 'storage' as BranchMediaSource,
    p_value: path,
    p_sort_order: 0,
  });
  if (registerError) {
    await createAdminClient().storage.from('branch-videos').remove([path]);
    return { success: false, error: '등록하지 못했습니다.' };
  }

  revalidatePath(`/branch/${branch.slug}`);
  revalidatePath('/');
  return { success: true };
}

const LINK_TYPES = new Set(['instagram', 'blog', 'youtube', 'website', 'etc']);

/** SNS/외부 링크 저장(선택) - 인스타그램/블로그/유튜브/홈페이지/기타. 값이 있는 것만 저장한다. */
export async function savePartnerBranchLinksAction(
  branchId: string,
  links: { type: string; url: string }[]
): Promise<ActionResult> {
  const partner = await requirePartner();
  const supabase = createServerSupabaseClient();
  const { data: branch } = await supabase.from('ga_branch').select('id, slug, ga_company_id').eq('id', branchId).maybeSingle();
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  for (const [i, link] of links.entries()) {
    const trimmed = link.url.trim();
    if (!trimmed || !LINK_TYPES.has(link.type)) continue;
    let normalized: string;
    try {
      normalized = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).toString();
    } catch {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await supabase.rpc('upsert_branch_link', {
      p_link_id: null,
      p_branch_id: branchId,
      p_type: link.type,
      p_url: normalized,
      p_sort_order: i,
    });
  }

  revalidatePath(`/branch/${branch.slug}`);
  return { success: true };
}

/** 신규 지점 추가 - 소속 GA가 이미 승인된 상태면 관리자 재검토 전까지 비공개(hidden)로 대기. */
export async function createPartnerBranchAction(input: {
  name: string;
  regionId: string | null;
  address: string;
  addressDetail?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<ActionResult> {
  if (!input.name.trim() || !input.address.trim()) {
    return { success: false, error: '지점명과 주소를 입력해주세요.' };
  }

  const partner = await requirePartner();
  if (!partner.ga_company_id) {
    return { success: false, error: '등록된 GA가 없습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('create_partner_branch', {
    p_slug: uniqueSlug(input.name, `${partner.ga_company_id}-${Date.now()}`),
    p_name: input.name.trim(),
    p_region_id: input.regionId,
    p_manager_name: null,
    p_address: input.address.trim(),
    p_address_detail: input.addressDetail?.trim() ?? null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });

  if (error) {
    return { success: false, error: '지점 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/partner/branches');
  return { success: true };
}

/** 반려된 지점 등록을 다시 심사받는다(0101).
 *
 * 🔴 이건 신규 기능이 아니라 화면이 이미 한 약속을 이행하는 것이다. 반려 상태 화면이
 * "정보를 수정해 다시 제출해주세요"라고 안내하는데 다시 제출할 경로가 없었다. 지금까지
 * 안 터진 이유는 실사용 반려 건이 없었기 때문이고, 한 명이라도 반려되는 순간 드러난다.
 *
 * 🔴 호출 전에 화면이 반려 사유를 먼저 보여줘야 한다 - RPC가 review_reason을 null로
 * 지우기 때문에, 누른 뒤에는 무엇을 고쳐야 했는지 확인할 방법이 사라진다. */
export async function resubmitBranchRegistrationAction(registrationId: string, branchId: string): Promise<ActionResult> {
  const partner = await requirePartner();
  if (!partner.ga_company_id) {
    return { success: false, error: '등록된 GA가 없습니다.' };
  }

  const supabase = createServerSupabaseClient();
  // 소유권은 RPC 안에서 is_ga_admin_for_branch로 다시 확인한다(판정 기준을 DB 한 곳에 둔다).
  const { error } = await supabase.rpc('resubmit_branch_registration', {
    p_registration_id: registrationId,
  });

  if (error) {
    // RPC가 올리는 예외를 사용자 언어로 옮긴다. 모르는 코드는 일반 문구로 떨어뜨린다.
    const map: Record<string, string> = {
      REGISTRATION_NOT_FOUND: '등록 요청을 찾을 수 없습니다.',
      // 같은 GA 소속이어도 제출자 본인만 재제출할 수 있다(반려 사유를 읽을 수 있는
      // 사람과 범위를 맞췄다). 막다른 길로 두지 않도록 누구에게 부탁해야 하는지 알린다.
      NOT_REGISTRATION_OWNER: '이 등록을 제출한 담당자만 다시 제출할 수 있습니다. 처음 등록하신 분께 요청해주세요.',
      NOT_AUTHORIZED_FOR_BRANCH: '이 지점의 등록 요청을 다시 제출할 권한이 없습니다.',
      ALREADY_PENDING: '이미 심사 중입니다.',
      ALREADY_APPROVED: '이미 승인된 등록입니다.',
      NOT_REJECTED: '반려된 등록만 다시 제출할 수 있습니다.',
    };
    const known = Object.keys(map).find((code) => error.message.includes(code));
    return { success: false, error: known ? map[known] : '재제출에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/partner/branches');
  revalidatePath(`/partner/branches/${branchId}`);
  return { success: true };
}
