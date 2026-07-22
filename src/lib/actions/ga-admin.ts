'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GaApprovalStatus } from '@/types/database';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { requireAdmin } from '@/lib/admin/session';
import {
  mockCreateGaCompany,
  mockSetGaApprovalStatus,
  mockUpdateGaCompany,
  mockVerifyGaCompany,
  type MockGaCompanyFormInput,
} from '@/lib/mock/admin-mutations';

export type ActionResult = { success: true } | { success: false; error: string };

/** GA 생성/수정 폼 공통 입력. 지금은 관리자만 이 액션을 호출하지만, 필드 구성은
 * 향후 파트너 셀프등록/수정 폼이 그대로 재사용할 수 있도록 맞춰뒀다. */
export type GaCompanyActionInput = MockGaCompanyFormInput;
/** 수정 화면은 탭별로 독립 저장되므로, 각 탭은 자신이 다루는 필드만 보내면 된다
 * (보내지 않은 필드는 그대로 유지된다 - mockUpdateGaCompany의 부분 업데이트 참고). */
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

  if (IS_MOCK_MODE) {
    // Mock 모드에는 실제 Storage가 없다 - 경로만 발급하고, 화면 미리보기는
    // 클라이언트가 선택한 파일을 그대로(URL.createObjectURL) 보여준다.
    return { success: true, path: `mock/${path}` };
  }

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

  if (IS_MOCK_MODE) {
    const admin = await requireAdmin();
    try {
      mockSetGaApprovalStatus(gaCompanyId, status, admin.id, reason);
    } catch {
      return { success: false, error: '처리하지 못했습니다.' };
    }
    revalidatePath('/admin');
    revalidatePath('/admin/ga');
    return { success: true };
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

  if (IS_MOCK_MODE) {
    const result = mockCreateGaCompany({ ...input, slug: input.slug.trim(), name: input.name.trim() });
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    revalidatePath('/admin/ga');
    return { success: true, gaCompanyId: result.id };
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

export async function updateGaCompanyAction(gaCompanyId: string, input: GaCompanyUpdateInput): Promise<ActionResult> {
  if (input.name !== undefined && !input.name.trim()) {
    return { success: false, error: 'GA명을 입력해주세요.' };
  }

  if (IS_MOCK_MODE) {
    try {
      mockUpdateGaCompany(gaCompanyId, { ...input, name: input.name?.trim() });
    } catch {
      return { success: false, error: '수정하지 못했습니다.' };
    }
    revalidatePath('/admin/ga');
    revalidatePath(`/admin/ga/${gaCompanyId}`);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_ga_company', {
    p_ga_company_id: gaCompanyId,
    p_name: input.name?.trim() ?? '',
    p_ceo_name: input.ceoName?.trim() || undefined,
    p_description: input.description?.trim() || undefined,
    p_logo_path: input.logoPath || undefined,
    p_status: input.status,
  });

  if (error) {
    return { success: false, error: '수정하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin/ga');
  revalidatePath(`/admin/ga/${gaCompanyId}`);
  return { success: true };
}

export async function verifyGaCompanyAction(
  gaCompanyId: string,
  verified: boolean
): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    const admin = await requireAdmin();
    try {
      mockVerifyGaCompany(gaCompanyId, verified, admin.id);
    } catch {
      return { success: false, error: '처리하지 못했습니다.' };
    }
    revalidatePath('/admin/ga');
    revalidatePath(`/admin/ga/${gaCompanyId}`);
    return { success: true };
  }

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
