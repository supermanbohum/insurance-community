'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GaApprovalStatus, GaDisplayStatus } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };

/** GA는 회사 정보/로고/브랜드 소개만 갖는 상위 엔티티다 - 주소/연락처/SNS/교육/복지 등은
 * 전부 지점(Branch) 등록 화면에서 입력한다. */
export interface GaCompanyActionInput {
  name: string;
  ceoName?: string;
  description?: string;
  logoPath?: string;
  status?: GaDisplayStatus;
}
/** 수정 화면은 탭별로 독립 저장되므로, 각 탭은 자신이 다루는 필드만 보내면 된다. */
export type GaCompanyUpdateInput = Partial<GaCompanyActionInput>;

const LOGO_BUCKET = 'company-logos';
const LOGO_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadGaLogoAction(
  gaCompanyId: string,
  formData: FormData
): Promise<ActionResult & { path?: string }> {
  const file = formData.get('logo');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }

  const extension = LOGO_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: '로고 이미지는 최대 2MB까지 업로드할 수 있습니다.' };
  }

  const path = `${gaCompanyId}/${randomUUID()}.${extension}`;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  return { success: true, path };
}

/**
 * GA 승인 상태 변경 (pending/approved/rejected/suspended).
 * 실제 권한 검증은 0008의 set_ga_company_approval_status() SQL 함수(current_admin_id())가
 * 수행한다 - 여기서는 호출만 중계한다.
 */
export async function setGaApprovalStatusAction(
  gaCompanyId: string,
  status: GaApprovalStatus,
  reason?: string
): Promise<ActionResult> {
  if ((status === 'rejected' || status === 'suspended') && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_ga_company_approval_status', {
    p_ga_company_id: gaCompanyId,
    p_status: status,
    p_reason: reason || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/ga');
  return { success: true };
}

export async function createGaCompanyAction(
  input: { slug: string } & GaCompanyActionInput
): Promise<ActionResult & { gaCompanyId?: string }> {
  if (!input.slug.trim() || !input.name.trim()) {
    return { success: false, error: 'GA명과 slug를 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('create_ga_company', {
    p_slug: input.slug.trim(),
    p_name: input.name.trim(),
    p_ceo_name: input.ceoName?.trim() || undefined,
    p_description: input.description?.trim() || undefined,
    p_logo_path: input.logoPath || undefined,
  });

  if (error || !data) {
    const message = error?.message.includes('duplicate')
      ? '이미 사용 중인 slug입니다.'
      : '등록하지 못했습니다. 입력값을 확인해주세요.';
    return { success: false, error: message };
  }

  revalidatePath('/admin/ga');
  return { success: true, gaCompanyId: data };
}

/**
 * 부분 업데이트 - input에 실제로 포함되지 않은 필드(undefined)는 기존 값을 그대로 보존한다.
 * 선택 필드(대표자/소개/로고)를 명시적으로 지우려면 빈 문자열('')을 보내야 한다.
 */
export async function updateGaCompanyAction(gaCompanyId: string, input: GaCompanyUpdateInput): Promise<ActionResult> {
  if (input.name !== undefined && !input.name.trim()) {
    return { success: false, error: 'GA명을 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_ga_company', {
    p_ga_company_id: gaCompanyId,
    p_name: input.name?.trim(),
    p_ceo_name: input.ceoName !== undefined ? input.ceoName.trim() : undefined,
    p_description: input.description !== undefined ? input.description.trim() : undefined,
    p_logo_path: input.logoPath,
    p_status: input.status,
  });

  if (error) {
    return { success: false, error: '수정하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin/ga');
  revalidatePath(`/admin/ga/${gaCompanyId}`);
  return { success: true };
}

/** 노출 여부(공개/비공개)만 전환한다 - updateGaCompanyAction과 달리 다른 필드에 영향 없음. */
export async function setGaDisplayStatusAction(gaCompanyId: string, status: 'visible' | 'hidden'): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_ga_company_status', { p_ga_company_id: gaCompanyId, p_status: status });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidatePath('/admin/ga');
  revalidatePath(`/admin/ga/${gaCompanyId}`);
  return { success: true };
}

export async function verifyGaCompanyAction(
  gaCompanyId: string,
  verified: boolean
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('verify_ga_company', {
    p_ga_company_id: gaCompanyId,
    p_verified: verified,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin/ga');
  revalidatePath(`/admin/ga/${gaCompanyId}`);
  return { success: true };
}

export interface GaCompanyDeleteImpact {
  branchCount: number;
}

export async function getGaCompanyDeleteImpactAction(gaCompanyId: string): Promise<GaCompanyDeleteImpact | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_ga_company_delete_impact', { p_ga_company_id: gaCompanyId }).single();
  if (error || !data) return null;
  return { branchCount: data.branch_count };
}

/** 소프트 삭제 - status를 'deleted'로 전환한다. 소속 지점 전체도 함께 'deleted' 처리된다(0011 SQL). */
export async function deleteGaCompanyAction(gaCompanyId: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_ga_company_status', {
    p_ga_company_id: gaCompanyId,
    p_status: 'deleted',
  });

  if (error) {
    return { success: false, error: '삭제하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin/ga');
  revalidatePath('/admin/branches');
  return { success: true };
}
