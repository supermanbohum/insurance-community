'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GaStatus, GaOperationType } from '@/types/database';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { slugify } from '@/lib/utils';
import {
  mockCloseBranchRecruit,
  mockCreateBranch,
  mockCreateBranchRecruit,
  mockDeleteBranchContact,
  mockSetBranchInsurers,
  mockSetBranchRecommended,
  mockSetBranchStatus,
  mockUpdateBranch,
  mockUpsertBranchContact,
} from '@/lib/mock/admin-mutations';

export type ActionResult = { success: true } | { success: false; error: string };

export interface BranchFormInput {
  name: string;
  regionId: string | null;
  managerName?: string;
  address: string;
  addressDetail?: string;
  lat?: number;
  lng?: number;
  introText?: string;
  educationInfo?: string;
  welfareInfo?: string;
  dbSupportInfo?: string;
  settlementSupportInfo?: string;
  atmosphereInfo?: string;
  operationType?: GaOperationType;
  isHeadquarters?: boolean;
}

function revalidateBranch(branchId?: string) {
  revalidatePath('/admin/branches');
  if (branchId) revalidatePath(`/admin/branches/${branchId}`);
  revalidatePath('/admin');
}

export async function createBranchAction(
  gaCompanyId: string,
  input: BranchFormInput
): Promise<ActionResult & { branchId?: string }> {
  if (!input.name.trim() || !input.address.trim()) {
    return { success: false, error: '지점명과 주소를 입력해주세요.' };
  }

  if (IS_MOCK_MODE) {
    const { id } = mockCreateBranch(gaCompanyId, { ...input, name: input.name.trim(), address: input.address.trim() });
    revalidateBranch(id);
    return { success: true, branchId: id };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('create_branch', {
    p_ga_company_id: gaCompanyId,
    p_region_id: input.regionId,
    p_slug: slugify(input.name.trim()),
    p_name: input.name.trim(),
    p_manager_name: input.managerName?.trim() || undefined,
    p_address: input.address.trim(),
    p_address_detail: input.addressDetail?.trim() || undefined,
    p_lat: input.lat,
    p_lng: input.lng,
    p_intro_text: input.introText?.trim() || undefined,
    p_education_info: input.educationInfo?.trim() || undefined,
    p_welfare_info: input.welfareInfo?.trim() || undefined,
    p_db_support_info: input.dbSupportInfo?.trim() || undefined,
    p_settlement_support_info: input.settlementSupportInfo?.trim() || undefined,
    p_atmosphere_info: input.atmosphereInfo?.trim() || undefined,
    p_operation_type: input.operationType,
    p_is_headquarters: input.isHeadquarters,
  });

  if (error || !data) {
    return { success: false, error: '등록하지 못했습니다. 입력값을 확인해주세요.' };
  }

  revalidateBranch(data);
  return { success: true, branchId: data };
}

export async function updateBranchAction(branchId: string, input: BranchFormInput): Promise<ActionResult> {
  if (!input.name.trim() || !input.address.trim()) {
    return { success: false, error: '지점명과 주소를 입력해주세요.' };
  }

  if (IS_MOCK_MODE) {
    try {
      mockUpdateBranch(branchId, { ...input, name: input.name.trim(), address: input.address.trim() });
    } catch {
      return { success: false, error: '저장하지 못했습니다.' };
    }
    revalidateBranch(branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_branch', {
    p_branch_id: branchId,
    p_name: input.name.trim(),
    p_manager_name: input.managerName?.trim() || undefined,
    p_region_id: input.regionId,
    p_address: input.address.trim(),
    p_address_detail: input.addressDetail?.trim() || undefined,
    p_lat: input.lat,
    p_lng: input.lng,
    p_intro_text: input.introText?.trim() || undefined,
    p_education_info: input.educationInfo?.trim() || undefined,
    p_welfare_info: input.welfareInfo?.trim() || undefined,
    p_db_support_info: input.dbSupportInfo?.trim() || undefined,
    p_settlement_support_info: input.settlementSupportInfo?.trim() || undefined,
    p_atmosphere_info: input.atmosphereInfo?.trim() || undefined,
    p_operation_type: input.operationType,
    p_is_headquarters: input.isHeadquarters,
  });

  if (error) {
    return { success: false, error: '저장하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidateBranch(branchId);
  return { success: true };
}

export async function setBranchStatusAction(branchId: string, status: GaStatus): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    try {
      mockSetBranchStatus(branchId, status);
    } catch {
      return { success: false, error: '처리하지 못했습니다.' };
    }
    revalidateBranch(branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_branch_status', { p_branch_id: branchId, p_status: status });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateBranch(branchId);
  return { success: true };
}

export async function setBranchRecommendedAction(
  branchId: string,
  isRecommended: boolean
): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    try {
      mockSetBranchRecommended(branchId, isRecommended);
    } catch {
      return { success: false, error: '처리하지 못했습니다.' };
    }
    revalidateBranch(branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_branch_recommended', {
    p_branch_id: branchId,
    p_is_recommended: isRecommended,
  });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateBranch(branchId);
  return { success: true };
}

export async function setBranchInsurersAction(branchId: string, insurerIds: string[]): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    mockSetBranchInsurers(branchId, insurerIds);
    revalidateBranch(branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_branch_insurers', {
    p_branch_id: branchId,
    p_insurer_ids: insurerIds,
  });
  if (error) return { success: false, error: '저장하지 못했습니다.' };
  revalidateBranch(branchId);
  return { success: true };
}

// ---------------------------------------------------------------
// 연락처 (type/value 자유형)
// ---------------------------------------------------------------
export async function upsertBranchContactAction(input: {
  contactId: string | null;
  branchId: string;
  type: string;
  value: string;
  label?: string;
  sortOrder?: number;
}): Promise<ActionResult> {
  if (!input.type.trim() || !input.value.trim()) {
    return { success: false, error: '연락 채널 종류와 값을 입력해주세요.' };
  }

  if (IS_MOCK_MODE) {
    try {
      mockUpsertBranchContact({ ...input, type: input.type.trim(), value: input.value.trim() });
    } catch {
      return { success: false, error: '저장하지 못했습니다.' };
    }
    revalidateBranch(input.branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('upsert_branch_contact', {
    p_contact_id: input.contactId,
    p_branch_id: input.branchId,
    p_type: input.type.trim(),
    p_value: input.value.trim(),
    p_label: input.label?.trim() || undefined,
    p_sort_order: input.sortOrder ?? 0,
  });

  if (error) return { success: false, error: '저장하지 못했습니다.' };
  revalidateBranch(input.branchId);
  return { success: true };
}

export async function deleteBranchContactAction(contactId: string, branchId: string): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    mockDeleteBranchContact(contactId);
    revalidateBranch(branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('delete_branch_contact', { p_contact_id: contactId });
  if (error) return { success: false, error: '삭제하지 못했습니다.' };
  revalidateBranch(branchId);
  return { success: true };
}

// ---------------------------------------------------------------
// 채용 (공식채용)
// ---------------------------------------------------------------
export async function createBranchRecruitAction(input: {
  branchId: string;
  title: string;
  content: string;
  employmentType?: string;
  endAt?: string;
}): Promise<ActionResult> {
  if (!input.title.trim() || !input.content.trim()) {
    return { success: false, error: '제목과 내용을 입력해주세요.' };
  }

  if (IS_MOCK_MODE) {
    mockCreateBranchRecruit({ ...input, title: input.title.trim(), content: input.content.trim() });
    revalidateBranch(input.branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('create_branch_recruit', {
    p_branch_id: input.branchId,
    p_title: input.title.trim(),
    p_content: input.content.trim(),
    p_employment_type: input.employmentType || undefined,
    p_end_at: input.endAt || undefined,
  });

  if (error) return { success: false, error: '등록하지 못했습니다.' };
  revalidateBranch(input.branchId);
  return { success: true };
}

export async function closeBranchRecruitAction(recruitId: string, branchId: string): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    try {
      mockCloseBranchRecruit(recruitId);
    } catch {
      return { success: false, error: '마감 처리하지 못했습니다.' };
    }
    revalidateBranch(branchId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('close_branch_recruit', { p_recruit_id: recruitId });
  if (error) return { success: false, error: '마감 처리하지 못했습니다.' };
  revalidateBranch(branchId);
  return { success: true };
}
