'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePartner } from '@/lib/partner/session';
import { slugify } from '@/lib/utils';
import type { BranchMediaSource } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };
export type RegisterGaResult =
  | { success: true; branchId: string; registrationId: string }
  | { success: false; error: string };

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
  if (partner.ga_company_id) {
    return { success: false, error: '이미 등록된 지점이 있습니다.' };
  }

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
    return { success: false, error: '지점 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/partner');
  revalidatePath('/admin/change-requests');
  return { success: true, branchId: data.branch_id, registrationId: data.registration_id };
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
  if (partner.branch_id && partner.branch_id !== branchId) {
    return { success: false, error: '접근 권한이 없습니다.' };
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
        await supabase.rpc('create_branch_recruit', {
          p_branch_id: branchId,
          p_title: input.recruit.title,
          p_content: input.recruit.content,
        });
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
    },
  });
  if (error || !registrationId) {
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
