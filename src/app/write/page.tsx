import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/post/PostForm';
import { createPostAction } from '@/lib/actions/posts';

export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const supabase = createServerSupabaseClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .eq('admin_only_write', false)
    .order('sort_order', { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-0 py-3 lg:px-6 lg:py-6">
      <h1 className="px-4 pb-2 text-lg font-bold text-gray-900 lg:px-0">글쓰기</h1>
      <PostForm mode="create" categories={categories ?? []} action={createPostAction} />
    </div>
  );
}
