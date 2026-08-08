import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AuthorNameType } from '@/types/database';

export interface CommentRow {
  id: string;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  author_display_name: string;
  author_name_type: AuthorNameType;
  created_at: string;
}

export interface CommentThread extends CommentRow {
  replies: CommentRow[];
}

const COMMENT_SELECT = 'id, parent_comment_id, author_id, content, author_display_name, author_name_type, created_at';

/** 댓글 목록 조회. RLS("public read visible comments")가 status='visible' + deleted_at is null +
 * 원글 status='visible' 조건을 이미 강제하지만, 쿼리에도 명시해 의도를 분명히 한다.
 * "1단계 대댓글만 허용"(comments 테이블 설계) 그대로, 최상위 댓글 아래 답글만 한 단계 중첩한다. */
export async function getPostComments(postId: string): Promise<CommentThread[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .eq('status', 'visible')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  const rows = data as unknown as CommentRow[];
  const topLevel = rows.filter((row) => row.parent_comment_id === null);
  const repliesByParent = new Map<string, CommentRow[]>();
  for (const row of rows) {
    if (row.parent_comment_id === null) continue;
    const list = repliesByParent.get(row.parent_comment_id) ?? [];
    list.push(row);
    repliesByParent.set(row.parent_comment_id, list);
  }

  return topLevel.map((comment) => ({ ...comment, replies: repliesByParent.get(comment.id) ?? [] }));
}
