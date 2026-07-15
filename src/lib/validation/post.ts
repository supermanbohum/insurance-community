import { z } from 'zod';
import { DEFAULT_OPERATION_SETTINGS } from '@/lib/config/site';

export const POST_TITLE_MIN_LENGTH = 2;
export const POST_TITLE_MAX_LENGTH = 100;
export const POST_CONTENT_MIN_LENGTH = 5;
export const POST_CONTENT_MAX_LENGTH = 10000;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_MAX_COUNT = DEFAULT_OPERATION_SETTINGS.imageMaxCountPerPost;
export const IMAGE_MAX_SIZE_BYTES = DEFAULT_OPERATION_SETTINGS.imageMaxSizeMb * 1024 * 1024;

export const postFormSchema = z.object({
  categoryId: z.string().uuid({ message: '카테고리를 선택해주세요.' }),
  title: z
    .string()
    .trim()
    .min(POST_TITLE_MIN_LENGTH, `제목은 최소 ${POST_TITLE_MIN_LENGTH}자 이상 입력해주세요.`)
    .max(POST_TITLE_MAX_LENGTH, `제목은 최대 ${POST_TITLE_MAX_LENGTH}자까지 입력 가능합니다.`),
  content: z
    .string()
    .trim()
    .min(POST_CONTENT_MIN_LENGTH, `본문은 최소 ${POST_CONTENT_MIN_LENGTH}자 이상 입력해주세요.`)
    .max(POST_CONTENT_MAX_LENGTH, `본문은 최대 ${POST_CONTENT_MAX_LENGTH}자까지 입력 가능합니다.`),
  authorDisplayName: z
    .string()
    .trim()
    .min(1, '작성자명을 입력해주세요.')
    .max(
      DEFAULT_OPERATION_SETTINGS.authorNameMaxLength,
      `작성자명은 최대 ${DEFAULT_OPERATION_SETTINGS.authorNameMaxLength}자까지 입력 가능합니다.`
    ),
  authorNameType: z.enum(['custom', 'random']),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return 'jpg, png, webp 형식의 이미지만 첨부할 수 있습니다.';
  }
  if (file.size > IMAGE_MAX_SIZE_BYTES) {
    return `이미지 용량은 최대 ${DEFAULT_OPERATION_SETTINGS.imageMaxSizeMb}MB까지 가능합니다.`;
  }
  return null;
}
