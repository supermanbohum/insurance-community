'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { mockStore } from '@/lib/mock/store';
import {
  mockRegisterGaForPartner,
  mockSubmitGaCompanyChange,
  mockSubmitBranchChange,
  mockCreateBranchDraft,
  mockCreateBranch,
  type MockBranchFormInput,
  type MockGaCompanyFormInput,
} from '@/lib/mock/admin-mutations';
import { requirePartner } from '@/lib/partner/session';

export type ActionResult = { success: true } | { success: false; error: string };

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** 가입 직후 GA + 첫 지점을 한 번에 등록(pending). */
export async function registerGaAction(input: {
  name: string;
  ceoName?: string;
  description?: string;
  branch: {
    name: string;
    regionId: string | null;
    address: string;
    addressDetail?: string;
    introText?: string;
    plannerCount?: number | null;
    parkingAvailable?: boolean | null;
    visitConsultAvailable?: boolean | null;
    businessHours?: string | null;
  };
}): Promise<ActionResult> {
  if (!input.name.trim() || !input.branch.name.trim() || !input.branch.address.trim()) {
    return { success: false, error: 'GA명, 지점명, 주소는 필수입니다.' };
  }
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const partner = await requirePartner();
  if (partner.ga_company_id) {
    return { success: false, error: '이미 등록된 GA가 있습니다.' };
  }

  const result = mockRegisterGaForPartner(partner.id, {
    slug: `${slugify(input.name)}-${partner.id.slice(-6)}`,
    name: input.name.trim(),
    ceoName: input.ceoName?.trim(),
    description: input.description?.trim(),
    branch: {
      name: input.branch.name.trim(),
      regionId: input.branch.regionId,
      address: input.branch.address.trim(),
      addressDetail: input.branch.addressDetail?.trim(),
      introText: input.branch.introText?.trim(),
      plannerCount: input.branch.plannerCount ?? undefined,
      parkingAvailable: input.branch.parkingAvailable ?? undefined,
      visitConsultAvailable: input.branch.visitConsultAvailable ?? undefined,
      businessHours: input.branch.businessHours?.trim() ?? undefined,
    },
  });

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  revalidatePath('/partner');
  revalidatePath('/admin/ga');
  return { success: true };
}

/**
 * GA 프로필 수정(기본정보/운영정보/홍보/SNS 전 필드). 승인 전이면 즉시 반영,
 * 승인 후면 변경요청으로 대기. 필드 구성은 관리자 GaInfoTab/GaPromoTab/GaSnsTab과
 * 동일하게 맞춰뒀다 - 파트너용 UI가 나중에 이 액션을 그대로 호출하면 된다.
 */
export async function updateGaCompanyProfileAction(
  input: { name: string } & Partial<MockGaCompanyFormInput>
): Promise<ActionResult & { pending?: boolean }> {
  if (!input.name.trim()) {
    return { success: false, error: 'GA명을 입력해주세요.' };
  }
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const partner = await requirePartner();
  if (!partner.ga_company_id) {
    return { success: false, error: '등록된 GA가 없습니다.' };
  }

  const result = mockSubmitGaCompanyChange(partner.ga_company_id, partner.id, { ...input, name: input.name.trim() });

  revalidatePath('/partner/company');
  revalidatePath('/admin/change-requests');
  revalidatePath('/ga');
  return { success: true, pending: result.status === 'pending' };
}

/** 지점 정보 수정. 승인 전이면 즉시 반영, 승인 후면 변경요청으로 대기. */
export async function submitBranchChangeAction(
  branchId: string,
  input: Parameters<typeof mockSubmitBranchChange>[2]
): Promise<ActionResult & { pending?: boolean }> {
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const partner = await requirePartner();
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }
  if (partner.branch_id && partner.branch_id !== branchId) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  let result;
  try {
    result = mockSubmitBranchChange(branchId, partner.id, input);
  } catch {
    return { success: false, error: '저장하지 못했습니다.' };
  }

  revalidatePath('/partner/branches');
  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath('/admin/change-requests');
  revalidatePath(`/branch/${branchId}`);
  return { success: true, pending: result.status === 'pending' };
}

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * 대표 이미지 교체. 승인 전이면 즉시 반영, 승인 후면 변경요청으로 대기(이력에 "대표 이미지 변경"으로 남는다).
 * Mock 모드는 실제 Storage가 없어 경로만 등록한다 - 실제 Supabase 연결 시 Storage 업로드로 교체해야 한다.
 */
export async function submitBranchMainImageAction(branchId: string, formData: FormData): Promise<ActionResult & { pending?: boolean }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: '이미지는 최대 5MB까지 업로드할 수 있습니다.' };
  }
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const partner = await requirePartner();
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    return { success: false, error: '접근 권한이 없습니다.' };
  }

  const path = `mock/${branch.ga_company_id}/${branchId}/${randomUUID()}.${extension}`;
  const result = mockSubmitBranchChange(branchId, partner.id, { mainImage: { source: 'storage', value: path } });

  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath('/admin/change-requests');
  revalidatePath(`/branch/${branchId}`);
  return { success: true, pending: result.status === 'pending' };
}

/** 신규 지점 추가. GA가 이미 승인된 상태면 관리자 승인 전까지 비공개(hidden)로 대기. */
export async function createPartnerBranchAction(input: MockBranchFormInput): Promise<ActionResult> {
  if (!input.name.trim() || !input.address.trim()) {
    return { success: false, error: '지점명과 주소를 입력해주세요.' };
  }
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const partner = await requirePartner();
  if (!partner.ga_company_id) {
    return { success: false, error: '등록된 GA가 없습니다.' };
  }
  const company = mockStore.gaCompanies.find((c) => c.id === partner.ga_company_id);
  if (!company) {
    return { success: false, error: 'GA 정보를 찾을 수 없습니다.' };
  }

  if (company.approval_status === 'approved') {
    mockCreateBranchDraft(company.id, partner.id, input);
    revalidatePath('/admin/change-requests');
  } else {
    mockCreateBranch(company.id, input);
  }

  revalidatePath('/partner/branches');
  return { success: true };
}
