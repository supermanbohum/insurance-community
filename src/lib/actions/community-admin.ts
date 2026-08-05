'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

function revalidateCommunity() {
  revalidatePath('/admin/community');
  revalidatePath('/admin/community/comments');
  revalidatePath('/admin/community/reports');
}

/** 게시글 상태 변경 - visible(복원)/hidden(숨김)/deleted(삭제) 어느 상태에서든 서로 오갈 수 있다. */
export async function setPostStatusAction(postId: string, status: 'visible' | 'hidden' | 'deleted', reason?: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_set_post_status', { p_post_id: postId, p_status: status, p_reason: reason?.trim() || undefined });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}

export async function setPostNoticeAction(postId: string, isNotice: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_set_post_notice', { p_post_id: postId, p_is_notice: isNotice });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}

export async function setPostBestAction(postId: string, force: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_set_post_best', { p_post_id: postId, p_force: force });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}

export async function setCommentStatusAction(
  commentId: string,
  status: 'visible' | 'hidden' | 'deleted',
  reason?: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_set_comment_status', {
    p_comment_id: commentId,
    p_status: status,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}

export async function blockUserAction(anonymousProfileId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) {
    return { success: false, error: '차단 사유를 입력해주세요.' };
  }
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_block_user', { p_anonymous_profile_id: anonymousProfileId, p_reason: reason.trim() });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}

export async function unblockUserAction(anonymousProfileId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_unblock_user', { p_anonymous_profile_id: anonymousProfileId });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}

export async function resolveReportAction(
  reportId: string,
  status: 'resolved_normal' | 'resolved_hidden' | 'resolved_deleted' | 'resolved_ban',
  note?: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_status: status, p_note: note?.trim() || undefined });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidateCommunity();
  return { success: true };
}
