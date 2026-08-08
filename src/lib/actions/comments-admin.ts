'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type AdminCommentActionResult = { success: true; commentId: string } | { success: false; error: string };

/** 운영팀 공식 댓글 작성(W-085) - "보험맵 운영팀" 명의로 즉시 공개된다. create_comment()는
 * W-084로 admin/system 명의를 신뢰하지 않게 막아서, 관리자 인증을 거치는 이 별도 경로로만
 * 공식 댓글을 쓸 수 있다(admin_create_post 패턴과 동일). */
export async function createAdminCommentAction(input: { postId: string; content: string }): Promise<AdminCommentActionResult> {
  if (!input.content.trim()) {
    return { success: false, error: '댓글 내용을 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('admin_create_comment_as', {
    p_post_id: input.postId,
    p_content: input.content.trim(),
  });

  if (error || !data) {
    return { success: false, error: error?.message.includes('POST_NOT_FOUND') ? '존재하지 않는 글입니다.' : '댓글을 작성하지 못했습니다.' };
  }

  revalidatePath('/admin/community/comments');
  revalidatePath(`/post/${input.postId}`);

  return { success: true, commentId: data as string };
}
