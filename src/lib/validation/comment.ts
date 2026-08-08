import { z } from 'zod';
import { DEFAULT_OPERATION_SETTINGS } from '@/lib/config/site';

export const COMMENT_CONTENT_MIN_LENGTH = 1;
export const COMMENT_CONTENT_MAX_LENGTH = 1000;

export const commentFormSchema = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable().optional(),
  content: z
    .string()
    .trim()
    .min(COMMENT_CONTENT_MIN_LENGTH, '댓글 내용을 입력해주세요.')
    .max(COMMENT_CONTENT_MAX_LENGTH, `댓글은 최대 ${COMMENT_CONTENT_MAX_LENGTH}자까지 입력 가능합니다.`),
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

export type CommentFormValues = z.infer<typeof commentFormSchema>;
