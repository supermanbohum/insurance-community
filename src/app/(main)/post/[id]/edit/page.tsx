import { redirect, notFound } from 'next/navigation';
import { getPostDetail } from '@/lib/posts/query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/post/PostForm';
import { updatePostAction } from '@/lib/actions/posts';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const result = await getPostDetail(params.id);

  if (!result) {
    notFound();
  }

  if (!result.isOwner) {
    redirect(`/post/${params.id}`);
  }

  const { post, images } = result;
  const supabase = createServerSupabaseClient();
  const existingImages = images.map((image) => ({
    id: image.id,
    url: supabase.storage.from('post-images').getPublicUrl(image.storage_path).data.publicUrl,
  }));

  const boundUpdateAction = updatePostAction.bind(null, params.id);

  return (
    <div className="mx-auto max-w-2xl px-0 py-3 lg:px-6 lg:py-6">
      <h1 className="px-4 pb-2 text-lg font-bold text-gray-900 lg:px-0">글 수정</h1>
      <PostForm
        mode="edit"
        initialValues={{
          categoryName: post.categories?.name ?? '',
          authorDisplayName: post.author_display_name,
          title: post.title,
          content: post.content,
        }}
        existingImages={existingImages}
        action={boundUpdateAction}
      />
    </div>
  );
}
