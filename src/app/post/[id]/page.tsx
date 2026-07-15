import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getPostDetail } from '@/lib/posts/query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DeletePostButton } from '@/components/post/DeletePostButton';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const result = await getPostDetail(params.id);

  if (!result) {
    notFound();
  }

  const { post, images, isOwner } = result;

  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_post_view', { p_post_id: params.id });

  const imageUrls = images.map((image) => ({
    id: image.id,
    url: supabase.storage.from('post-images').getPublicUrl(image.storage_path).data.publicUrl,
  }));

  const viewCount = post.organic_view_count + post.imported_view_count + post.correction_view_count;
  const upvoteCount = post.organic_upvote_count + post.imported_upvote_count + post.correction_upvote_count;

  return (
    <div className="px-4 py-4">
      <div className="text-xs text-brand-600">{post.categories?.name}</div>
      <h1 className="mt-1 text-lg font-bold text-gray-900">{post.title}</h1>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>{post.author_display_name}</span>
        <span>{format(new Date(post.created_at), 'yyyy.MM.dd HH:mm')}</span>
        <span>조회 {viewCount}</span>
        <span>추천 {upvoteCount}</span>
      </div>

      {imageUrls.length > 0 && (
        <div className="mt-4 space-y-3">
          {imageUrls.map((image) => (
            <div key={image.id} className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
              <Image src={image.url} alt="" fill sizes="100vw" className="object-contain" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{post.content}</div>

      {isOwner && (
        <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4">
          <Link
            href={`/post/${post.id}/edit`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            수정
          </Link>
          <DeletePostButton postId={post.id} />
        </div>
      )}
    </div>
  );
}
