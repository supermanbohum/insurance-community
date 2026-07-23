'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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

export async function uploadBranchImageAction(
  branchId: string,
  gaCompanyId: string,
  mediaType: Extract<BranchMediaType, 'image_main' | 'image_office'>,
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
    p_media_type: mediaType,
    p_source: 'storage' as BranchMediaSource,
    p_value: path,
    p_sort_order: 0,
  });

  if (registerError) {
    await supabase.storage.from(IMAGE_BUCKET).remove([path]);
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
    await supabase.storage.from(VIDEO_BUCKET).remove([path]);
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

  if (bucket && path) {
    await supabase.storage.from(bucket).remove([path]);
  }

  revalidateBranch(branchId);
  return { success: true };
}
