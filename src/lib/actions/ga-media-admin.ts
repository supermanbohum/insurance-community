'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GaMediaType } from '@/types/database';
import type { ActionResult } from '@/lib/actions/ga-admin';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { mockAddGaMedia, mockDeleteGaMedia } from '@/lib/mock/admin-mutations';

function revalidateGa(gaCompanyId: string) {
  revalidatePath('/admin/ga');
  revalidatePath(`/admin/ga/${gaCompanyId}`);
}

const BANNER_BUCKET = 'company-banners';
const GALLERY_BUCKET = 'company-gallery';
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function uploadGaImage(
  gaCompanyId: string,
  mediaType: GaMediaType,
  bucket: typeof BANNER_BUCKET | typeof GALLERY_BUCKET,
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

  const path = `${gaCompanyId}/${randomUUID()}.${extension}`;

  if (IS_MOCK_MODE) {
    // Mock 모드는 실제 Storage가 없어 등록만 하고 파일은 저장하지 않는다.
    mockAddGaMedia(gaCompanyId, mediaType, 'storage', `mock/${path}`);
    revalidateGa(gaCompanyId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { error: registerError } = await supabase.rpc('add_ga_media', {
    p_ga_company_id: gaCompanyId,
    p_media_type: mediaType,
    p_source: 'storage',
    p_value: path,
    p_sort_order: 0,
  });

  if (registerError) {
    await supabase.storage.from(bucket).remove([path]);
    return { success: false, error: '등록하지 못했습니다.' };
  }

  revalidateGa(gaCompanyId);
  return { success: true };
}

export async function uploadGaBannerAction(gaCompanyId: string, formData: FormData): Promise<ActionResult> {
  return uploadGaImage(gaCompanyId, 'banner', BANNER_BUCKET, formData);
}

export async function uploadGaGalleryImageAction(gaCompanyId: string, formData: FormData): Promise<ActionResult> {
  return uploadGaImage(gaCompanyId, 'gallery', GALLERY_BUCKET, formData);
}

export async function deleteGaMediaAction(
  mediaId: string,
  gaCompanyId: string,
  bucket: typeof BANNER_BUCKET | typeof GALLERY_BUCKET | null
): Promise<ActionResult> {
  if (IS_MOCK_MODE) {
    mockDeleteGaMedia(mediaId);
    revalidateGa(gaCompanyId);
    return { success: true };
  }

  const supabase = createServerSupabaseClient();
  const { data: path, error } = await supabase.rpc('delete_ga_media', { p_media_id: mediaId });

  if (error) return { success: false, error: '삭제하지 못했습니다.' };

  if (bucket && path) {
    await supabase.storage.from(bucket).remove([path]);
  }

  revalidateGa(gaCompanyId);
  return { success: true };
}
