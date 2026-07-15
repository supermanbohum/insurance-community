'use server';

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateAnonName } from '@/lib/anon-name';
import { detectPersonalInfo } from '@/lib/moderation';
import { postFormSchema, validateImageFile, IMAGE_MAX_COUNT } from '@/lib/validation/post';
import { toPostErrorMessage } from '@/lib/errors/post-errors';
import type { Database } from '@/types/database';

const STORAGE_BUCKET = 'post-images';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type PostActionResult =
  | { success: true; postId: string }
  | { success: false; error: string };

export type DeleteActionResult = { success: true } | { success: false; error: string };

function extractImageFiles(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function validatePersonalInfo(title: string, content: string): string | null {
  const titleResult = detectPersonalInfo(title);
  const contentResult = detectPersonalInfo(content);
  const reasons = [...titleResult.reasons, ...contentResult.reasons];
  if (reasons.length > 0) {
    return `개인정보로 의심되는 내용이 포함되어 있습니다 (${reasons.join(', ')}).`;
  }
  return null;
}

/** 이미지들을 순서대로 업로드 + 등록. 실패 시 이미 업로드된 Storage 객체 경로를 모아 예외로 던진다. */
async function uploadAndRegisterImages(
  supabase: SupabaseClient<Database>,
  postId: string,
  files: File[],
  startSortOrder: number
): Promise<void> {
  const uploadedPaths: string[] = [];

  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const invalidReason = validateImageFile(file);
      if (invalidReason) {
        throw new Error(invalidReason);
      }

      const extension = MIME_EXTENSIONS[file.type] ?? 'jpg';
      const storagePath = `${postId}/${randomUUID()}.${extension}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

      if (uploadError) {
        throw uploadError;
      }
      uploadedPaths.push(storagePath);

      const { error: registerError } = await supabase.rpc('add_post_image', {
        p_post_id: postId,
        p_storage_path: storagePath,
        p_sort_order: startSortOrder + i,
      });

      if (registerError) {
        throw registerError;
      }
    }
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
    }
    throw err;
  }
}

export async function createPostAction(formData: FormData): Promise<PostActionResult> {
  const supabase = createServerSupabaseClient();

  const authorNameType = formData.get('authorNameType') === 'custom' ? 'custom' : 'random';
  const rawAuthorName = String(formData.get('authorDisplayName') ?? '').trim();
  const authorDisplayName = authorNameType === 'custom' && rawAuthorName ? rawAuthorName : generateAnonName();

  const parsed = postFormSchema.safeParse({
    categoryId: formData.get('categoryId'),
    title: formData.get('title'),
    content: formData.get('content'),
    authorDisplayName,
    authorNameType,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' };
  }

  const personalInfoError = validatePersonalInfo(parsed.data.title, parsed.data.content);
  if (personalInfoError) {
    return { success: false, error: personalInfoError };
  }

  const imageFiles = extractImageFiles(formData, 'images').slice(0, IMAGE_MAX_COUNT);

  let postId: string;
  try {
    const { data, error } = await supabase.rpc('create_post', {
      p_category_id: parsed.data.categoryId,
      p_title: parsed.data.title,
      p_content: parsed.data.content,
      p_author_display_name: parsed.data.authorDisplayName,
      p_author_name_type: parsed.data.authorNameType,
    });
    if (error || !data) throw error ?? new Error('CREATE_FAILED');
    postId = data;
  } catch (err) {
    return { success: false, error: toPostErrorMessage(err) };
  }

  try {
    if (imageFiles.length > 0) {
      await uploadAndRegisterImages(supabase, postId, imageFiles, 0);
    }

    const { error: publishError } = await supabase.rpc('publish_post', { p_post_id: postId });
    if (publishError) throw publishError;
  } catch (err) {
    try {
      await supabase.rpc('delete_post_hard', { p_post_id: postId });
    } catch {
      // 롤백 실패는 무시 - 원래 에러 메시지를 사용자에게 그대로 전달한다.
    }
    return { success: false, error: toPostErrorMessage(err) };
  }

  return { success: true, postId };
}

export async function updatePostAction(
  postId: string,
  formData: FormData
): Promise<PostActionResult> {
  const supabase = createServerSupabaseClient();

  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();

  const parsed = postFormSchema
    .pick({ title: true, content: true })
    .safeParse({ title, content });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' };
  }

  const personalInfoError = validatePersonalInfo(parsed.data.title, parsed.data.content);
  if (personalInfoError) {
    return { success: false, error: personalInfoError };
  }

  try {
    const { error: updateError } = await supabase.rpc('update_post', {
      p_post_id: postId,
      p_title: parsed.data.title,
      p_content: parsed.data.content,
    });
    if (updateError) throw updateError;

    const deleteImageIds = formData.getAll('deleteImageIds').map(String).filter(Boolean);
    if (deleteImageIds.length > 0) {
      const removedPaths: string[] = [];
      for (const imageId of deleteImageIds) {
        const { data: storagePath, error: deleteImageError } = await supabase.rpc('delete_post_image', {
          p_image_id: imageId,
        });
        if (deleteImageError) throw deleteImageError;
        if (storagePath) removedPaths.push(storagePath);
      }
      if (removedPaths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(removedPaths);
      }
    }

    const newImageFiles = extractImageFiles(formData, 'newImages').slice(0, IMAGE_MAX_COUNT);
    if (newImageFiles.length > 0) {
      const { count } = await supabase
        .from('post_images')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);
      await uploadAndRegisterImages(supabase, postId, newImageFiles, count ?? 0);
    }
  } catch (err) {
    return { success: false, error: toPostErrorMessage(err) };
  }

  return { success: true, postId };
}

export async function deletePostAction(postId: string): Promise<DeleteActionResult> {
  const supabase = createServerSupabaseClient();

  try {
    const { data: removedPaths, error } = await supabase.rpc('soft_delete_post', {
      p_post_id: postId,
    });
    if (error) throw error;
    if (removedPaths && removedPaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(removedPaths);
    }
  } catch (err) {
    return { success: false, error: toPostErrorMessage(err) };
  }

  return { success: true };
}
