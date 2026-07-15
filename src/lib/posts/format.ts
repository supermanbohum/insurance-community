import type { Database, PublicPostSummary } from '@/types/database';

type PostRow = Database['public']['Tables']['posts']['Row'];

export interface PostListRow extends PostRow {
  categories: { slug: string; name: string } | null;
  post_images: { id: string }[] | null;
}

/**
 * organic(실제) / imported(이관) / correction(보정) 수치를 합산해 화면 표시값으로 변환한다.
 * 베스트 산정 로직(auto_best_score 기반 랭킹)은 Phase 3에서 구현되며,
 * 현재는 관리자가 강제 포함(force_include)한 글만 베스트 배지로 표시한다.
 */
export function toPublicPostSummary(post: PostListRow): PublicPostSummary {
  return {
    id: post.id,
    categorySlug: post.categories?.slug ?? '',
    categoryName: post.categories?.name ?? '',
    title: post.title,
    authorDisplayName: post.author_display_name,
    viewCount: post.organic_view_count + post.imported_view_count + post.correction_view_count,
    upvoteCount: post.organic_upvote_count + post.imported_upvote_count + post.correction_upvote_count,
    downvoteCount:
      post.organic_downvote_count + post.imported_downvote_count + post.correction_downvote_count,
    commentCount: post.organic_comment_count + post.correction_comment_count,
    isBest: post.best_override_status === 'force_include',
    isEditorPick: post.editor_pick,
    isNotice: post.is_notice,
    isPinned: post.is_pinned,
    hasImage: (post.post_images?.length ?? 0) > 0,
    createdAt: post.created_at,
  };
}
