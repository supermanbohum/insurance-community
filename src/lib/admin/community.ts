import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PostStatus } from '@/types/database';

export interface AdminCategoryItem {
  id: string;
  slug: string;
  name: string;
}

/** 커뮤니티 관리 탭 전용 - DEFAULT_CATEGORIES 상수가 아니라 실제 DB의 카테고리를
 * 그대로 읽는다(운영 중 새 카테고리가 추가돼도 코드 수정 없이 탭에 반영되도록). */
export async function listAdminCategories(): Promise<AdminCategoryItem[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('categories').select('id, slug, name').eq('is_active', true).order('sort_order', { ascending: true });
  return (data ?? []).map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
}

export interface AdminPostListItem {
  id: string;
  title: string;
  authorId: string;
  authorDisplayName: string;
  categoryName: string;
  viewCount: number;
  upvoteCount: number;
  status: PostStatus;
  isNotice: boolean;
  isBest: boolean;
  createdAt: string;
}

const POST_SELECT = `
  id, title, author_id, author_display_name, status, is_notice, best_override_status, created_at,
  organic_view_count, imported_view_count, correction_view_count,
  organic_upvote_count, imported_upvote_count, correction_upvote_count,
  categories ( name )
`;

/** 관리자용 게시글 목록 - 공개 조회와 달리 상태(hidden/deleted) 무관하게 전부 보인다. */
export async function listAdminPosts(options: { categorySlug?: string; limit?: number } = {}): Promise<AdminPostListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(options.limit ?? 100);

  if (options.categorySlug) {
    const { data: category } = await admin.from('categories').select('id').eq('slug', options.categorySlug).maybeSingle();
    if (!category) return [];
    query = query.eq('category_id', category.id);
  }

  const { data } = await query;
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    authorId: p.author_id,
    authorDisplayName: p.author_display_name,
    categoryName: (p.categories as unknown as { name: string } | null)?.name ?? '-',
    viewCount: p.organic_view_count + p.imported_view_count + p.correction_view_count,
    upvoteCount: p.organic_upvote_count + p.imported_upvote_count + p.correction_upvote_count,
    status: p.status,
    isNotice: p.is_notice,
    isBest: p.best_override_status === 'force_include',
    createdAt: p.created_at,
  }));
}

export interface AdminCommentListItem {
  id: string;
  content: string;
  authorId: string;
  authorDisplayName: string;
  postId: string;
  postTitle: string;
  status: PostStatus;
  createdAt: string;
}

/** 관리자용 댓글 목록 - 최신순, 최대 200개. */
export async function listAdminComments(limit = 200): Promise<AdminCommentListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('comments')
    .select('id, content, author_id, author_display_name, post_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!data) return [];

  const postIds = Array.from(new Set(data.map((c) => c.post_id)));
  const { data: posts } = postIds.length > 0 ? await admin.from('posts').select('id, title').in('id', postIds) : { data: [] };
  const postTitleMap = new Map((posts ?? []).map((p) => [p.id, p.title]));

  return data.map((c) => ({
    id: c.id,
    content: c.content,
    authorId: c.author_id,
    authorDisplayName: c.author_display_name,
    postId: c.post_id,
    postTitle: postTitleMap.get(c.post_id) ?? '(삭제된 게시글)',
    status: c.status,
    createdAt: c.created_at,
  }));
}

export interface AdminReportListItem {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  targetTitle: string;
  targetHref: string | null;
  targetAuthorId: string | null;
  reason: string;
  detail: string | null;
  status: string;
  createdAt: string;
}

/** 관리자용 신고 목록 - 신고 대상(게시글/댓글)의 제목/링크를 함께 붙인다. */
export async function listAdminReports(options: { status?: string } = {}): Promise<AdminReportListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
  if (options.status) {
    query = query.eq('status', options.status);
  }
  const { data } = await query;
  if (!data) return [];

  const postIds = data.filter((r) => r.target_type === 'post').map((r) => r.target_id);
  const commentIds = data.filter((r) => r.target_type === 'comment').map((r) => r.target_id);

  const [{ data: posts }, { data: comments }] = await Promise.all([
    postIds.length > 0 ? admin.from('posts').select('id, title, author_id').in('id', postIds) : Promise.resolve({ data: [] }),
    commentIds.length > 0
      ? admin.from('comments').select('id, content, post_id, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const postMap = new Map((posts ?? []).map((p) => [p.id, p]));
  const commentMap = new Map((comments ?? []).map((c) => [c.id, c]));

  return data.map((r) => {
    if (r.target_type === 'post') {
      const post = postMap.get(r.target_id);
      return {
        id: r.id,
        targetType: 'post' as const,
        targetId: r.target_id,
        targetTitle: post?.title ?? '(삭제된 게시글)',
        targetHref: post ? `/post/${r.target_id}` : null,
        targetAuthorId: post?.author_id ?? null,
        reason: r.reason,
        detail: r.detail,
        status: r.status,
        createdAt: r.created_at,
      };
    }
    const comment = commentMap.get(r.target_id);
    return {
      id: r.id,
      targetType: 'comment' as const,
      targetId: r.target_id,
      targetTitle: comment ? `댓글: ${comment.content.slice(0, 40)}` : '(삭제된 댓글)',
      targetHref: comment ? `/post/${comment.post_id}` : null,
      targetAuthorId: comment?.author_id ?? null,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      createdAt: r.created_at,
    };
  });
}
