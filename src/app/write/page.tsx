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
    <div>
      <h1 className="px-4 pt-4 text-xl font-bold text-gray-900">글쓰기</h1>
      <PostForm mode="create" categories={categories ?? []} action={createPostAction} />
    </div>
  );
}
