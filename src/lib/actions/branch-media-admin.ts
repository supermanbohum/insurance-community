'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BranchMediaSource, BranchMediaType } from '@/types/database';
import type { ActionResult } from '@/lib/actions/branch-admin';

function revalidateBranch(branchId: string) {
  revalidatePath('/admin/branches');
  revalidatePath(`/admin/branches/${branchId}`);
}

const IMAGE_BUCKET = 'branch-images';
const VIDEO_BUCKET = 'branch-videos';
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * 사진 업로드 - "몇 번째 사진이 대표사진인지"는 이 액션이 정하지 않는다.
 * add_branch_media RPC가 해당 지점에 이미지가 하나도 없으면 자동으로 대표사진(image_main)으로,
 * 있으면 나머지 사진(image_office)으로 저장한다(첫 업로드 = 대표사진 정책, 0021 참고).
 */
export async function uploadBranchImageAction(
  branchId: string,
  gaCompanyId: string,
  formData: FormData
): Promise<ActionResult> {
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

  const path = `${gaCompanyId}/${branchId}/${randomUUID()}.${extension}`;

  const supabase = createServerSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error: registerError } = await supabase.rpc('add_branch_media', {
    p_branch_id: branchId,
    p_media_type: 'image_office' as BranchMediaType, // 힌트일 뿐 - 실제 값은 RPC가 자동으로 결정한다
    p_source: 'storage' as BranchMediaSource,
    p_value: path,
  });

  if (registerError) {
    await createAdminClient().storage.from(IMAGE_BUCKET).remove([path]);
    return { success: false, error: '등록하지 못했습니다.' };
  }

  revalidateBranch(branchId);
  return { success: true };
}

export async function uploadBranchVideoAction(
  branchId: string,
  gaCompanyId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '파일을 선택해주세요.' };
  }

  const extension = VIDEO_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'mp4, webm, mov 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 200 * 1024 * 1024) {
    return { success: false, error: '영상은 최대 200MB까지 업로드할 수 있습니다.' };
  }

  const path = `${gaCompanyId}/${branchId}/${randomUUID()}.${extension}`;

  const supabase = createServerSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(VIDEO_BUCKET)
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
    await createAdminClient().storage.from(VIDEO_BUCKET).remove([path]);
    return { success: false, error: '등록하지 못했습니다.' };
  }

  revalidateBranch(branchId);
  return { success: true };
}

export async function addBranchVideoUrlAction(branchId: string, url: string): Promise<ActionResult> {
  if (!/^https?:\/\//.test(url.trim())) {
    return { success: false, error: '올바른 URL을 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('add_branch_media', {
    p_branch_id: branchId,
    p_media_type: 'video',
    p_source: 'external',
    p_value: url.trim(),
    p_sort_order: 0,
  });

  if (error) return { success: false, error: '등록하지 못했습니다.' };
  revalidateBranch(branchId);
  return { success: true };
}

export async function deleteBranchMediaAction(
  mediaId: string,
  branchId: string,
  bucket: 'branch-images' | 'branch-videos' | null
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { data: path, error } = await supabase.rpc('delete_branch_media', { p_media_id: mediaId });

  if (error) return { success: false, error: '삭제하지 못했습니다.' };

  // storage.objects의 delete RLS 정책은 anon 세션의 auth.uid() 컨텍스트에서 종종
  // current_admin_id()를 안정적으로 해석하지 못해 파일이 지워지지 않고 남는 문제가
  // 있었다(DB 레코드만 삭제되고 실제 파일은 고아로 남음) - service role로 확실히 지운다.
  if (bucket && path) {
    const adminClient = createAdminClient();
    const { error: removeError } = await adminClient.storage.from(bucket).remove([path]);
    if (removeError) {
      console.error('[deleteBranchMediaAction] storage.remove failed', removeError);
    }
  }

  revalidateBranch(branchId);
  return { success: true };
}

/**
 * 이미 올린 사진 중 하나를 대표사진으로 지정한다(0118).
 *
 * 🔴 왜 필요한가: 대표사진은 원래 **업로드 순서로만** 정해졌다. 바꾸려면 지우는 수밖에 없었고,
 *    실제로 컴패니언 7곳이 「사무실사진만 있고 대표 0장」 상태로 남아 CTO가 DB를 직접 고쳤다.
 *    같은 요청이 또 오면 또 불려간다 — 당사자가 화면에서 하게 만든다.
 *
 * 권한 판정은 RPC(is_ga_admin_for_branch)가 한다. 여기서 따로 비교하지 않는다 —
 * 판정이 두 군데면 반드시 어긋난다(2026-08-24 사고).
 */
export async function setBranchMainMediaAction(mediaId: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_branch_main_media', { p_media_id: mediaId });

  if (error) {
    const m = error.message ?? '';
    if (error.code === 'PGRST202' || /Could not find the function/i.test(m)) {
      return { success: false, error: '아직 서버에 적용되지 않은 기능입니다. 마이그레이션 0118을 실행해야 동작합니다.' };
    }
    // 분기 코드는 0118 정의에 실제로 있는 것만 쓴다
    if (m.includes('NOT_AUTHORIZED_FOR_BRANCH')) {
      return { success: false, error: '이 지점의 사진을 바꿀 권한이 없습니다.' };
    }
    if (m.includes('MEDIA_NOT_FOUND')) return { success: false, error: '사진을 찾을 수 없습니다.' };
    if (m.includes('NOT_AN_IMAGE')) return { success: false, error: '사진만 대표로 지정할 수 있습니다.' };
    return { success: false, error: '대표사진을 바꾸지 못했습니다.' };
  }

  revalidatePath('/admin/branches');
  revalidatePath('/partner');
  revalidatePath('/');
  revalidatePath('/search');
  return { success: true };
}
