import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { toPublicPostSummary, type PostListRow } from '@/lib/posts/format';
import type { PublicPostSummary } from '@/types/database';

export const POST_LIST_PAGE_SIZE = 20;

const LIST_SELECT = `
  id, title, author_display_name, organic_view_count, imported_view_count, correction_view_count,
  organic_upvote_count, imported_upvote_count, correction_upvote_count,
  organic_downvote_count, imported_downvote_count, correction_downvote_count,
  organic_comment_count, correction_comment_count, best_override_status, editor_pick,
  is_notice, is_pinned, created_at, category_id, author_id, author_admin_id, content,
  author_name_type, auto_best_score, best_rank_override, editor_pick_rank, editor_pick_reason,
  editor_pick_start_at, editor_pick_end_at, pinned_rank, status, is_seo_indexable, report_count,
  updated_at, deleted_at,
  categories ( slug, name ),
  post_images ( id )
`;

export interface PostListPageResult {
  summaries: PublicPostSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export async function getPostListPage(options: {
  categorySlug?: string;
  page?: number;
}): Promise<PostListPageResult> {
  const supabase = createServerSupabaseClient();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = POST_LIST_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('posts')
    .select(LIST_SELECT, { count: 'exact' })
    .eq('status', 'visible')
    .is('deleted_at', null);

  if (options.categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', options.categorySlug)
      .single();

    if (!category) {
      return { summaries: [], page, pageSize, totalCount: 0, totalPages: 0 };
    }

    query = query.eq('category_id', category.id);
  }

  const { data, count, error } = await query
    .order('is_pinned', { ascending: false })
    .order('is_notice', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const summaries = (data as unknown as PostListRow[]).map(toPublicPostSummary);
  const totalCount = count ?? 0;

  return {
    summaries,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export interface PostDetailResult {
  post: PostListRow;
  images: { id: string; storage_path: string; sort_order: number }[];
  isOwner: boolean;
}

export async function getPostDetail(postId: string): Promise<PostDetailResult | null> {
  const supabase = createServerSupabaseClient();

  const { data: post, error } = await supabase
    .from('posts')
    .select(LIST_SELECT)
    .eq('id', postId)
    .is('deleted_at', null)
    .single();

  if (error || !post) {
    return null;
  }

  const { data: images } = await supabase
    .from('post_images')
    .select('id, storage_path, sort_order')
    .eq('post_id', postId)
    .order('sort_order', { ascending: true });

  const { data: currentProfileId } = await supabase.rpc('current_profile_id');

  const postRow = post as unknown as PostListRow;

  return {
    post: postRow,
    images: images ?? [],
    isOwner: !!currentProfileId && currentProfileId === postRow.author_id,
  };
}

/** sitemap.xml 전용 - is_seo_indexable=false(관리자가 색인 제외 처리한 글)는 제외하고
 * 공개(visible) 글의 id/updated_at만 가볍게 조회한다. cookies()를 쓰지 않는 공개
 * 클라이언트라 sitemap.ts(별도 revalidate)에서 안전하게 호출할 수 있다. */
export async function listPostIdsForSitemap(): Promise<{ id: string; updatedAt: string }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, updated_at')
    .eq('status', 'visible')
    .eq('is_seo_indexable', true);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, updatedAt: row.updated_at }));
}
