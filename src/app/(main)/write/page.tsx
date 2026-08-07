import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/post/PostForm';
import { createPostAction } from '@/lib/actions/posts';

export const dynamic = 'force-dynamic';

/** category/title 쿼리파라미터로 카테고리+제목을 미리 채워 진입시킬 수 있다(W-003,
 * 지점 상세의 "이 지점 후기 쓰기" 버튼이 category=review&title=... 형태로 사용). */
export default async function WritePage({ searchParams }: { searchParams: { category?: string; title?: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .eq('admin_only_write', false)
    .order('sort_order', { ascending: true });

  const initialCategoryId = searchParams.category
    ? categories?.find((c) => c.slug === searchParams.category)?.id
    : undefined;

  return (
    <div className="mx-auto max-w-2xl px-0 py-3 lg:px-6 lg:py-6">
      <h1 className="px-4 pb-2 text-lg font-bold text-gray-900 lg:px-0">글쓰기</h1>
      <PostForm
        mode="create"
        categories={categories ?? []}
        initialCategoryId={initialCategoryId}
        initialTitle={searchParams.title}
        action={createPostAction}
      />
    </div>
  );
}
