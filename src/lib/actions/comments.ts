'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateAnonName } from '@/lib/anon-name';
import { detectPersonalInfo, containsBannedContent } from '@/lib/moderation';
import { commentFormSchema } from '@/lib/validation/comment';
import { toCommentErrorMessage } from '@/lib/errors/comment-errors';

export type CommentActionResult = { success: true; commentId: string } | { success: false; error: string };

function validatePersonalInfo(content: string): string | null {
  const result = detectPersonalInfo(content);
  if (result.reasons.length > 0) {
    return `개인정보로 의심되는 내용이 포함되어 있습니다 (${result.reasons.join(', ')}).`;
  }
  return null;
}

/** W-072(CT-022)와 동일 원칙 - 어떤 단어가 걸렸는지는 표시하지 않는다. */
function validateBannedContent(content: string): string | null {
  if (containsBannedContent(content)) {
    return '커뮤니티 운영 원칙에 따라 등록할 수 없는 표현이 포함되어 있습니다. 표현을 수정해 다시 시도해 주세요. (정상적인 댓글이 등록되지 않는다면 고객센터로 알려주세요)';
  }
  return null;
}

export async function createCommentAction(formData: FormData): Promise<CommentActionResult> {
  const supabase = createServerSupabaseClient();

  const parsed = commentFormSchema.safeParse({
    postId: formData.get('postId'),
    parentCommentId: formData.get('parentCommentId') || null,
    content: formData.get('content'),
    authorDisplayName:
      formData.get('authorNameType') === 'random' ? generateAnonName() : formData.get('authorDisplayName'),
    authorNameType: formData.get('authorNameType'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' };
  }

  const personalInfoError = validatePersonalInfo(parsed.data.content);
  if (personalInfoError) {
    return { success: false, error: personalInfoError };
  }
  const bannedContentError = validateBannedContent(parsed.data.content);
  if (bannedContentError) {
    return { success: false, error: bannedContentError };
  }

  const { data, error } = await supabase.rpc('create_comment', {
    p_post_id: parsed.data.postId,
    p_content: parsed.data.content,
    p_author_display_name: parsed.data.authorDisplayName,
    p_author_name_type: parsed.data.authorNameType,
    p_parent_comment_id: parsed.data.parentCommentId ?? null,
  });

  if (error || !data) {
    return { success: false, error: toCommentErrorMessage(error) };
  }

  return { success: true, commentId: data as unknown as string };
}
