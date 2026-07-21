import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getPostDetail } from '@/lib/posts/query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DeletePostButton } from '@/components/post/DeletePostButton';
import { Sidebar } from '@/components/layout/Sidebar';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  // 조회수 집계(중복 방지 포함)를 먼저 반영한 뒤 게시글을 조회해야,
  // 이번 진입으로 증가한 값이 같은 렌더링에서 바로 표시된다.
  await supabase.rpc('record_post_view', { p_post_id: params.id });

  const result = await getPostDetail(params.id);

  if (!result) {
    notFound();
  }

  const { post, images, isOwner } = result;

  const imageUrls = images.map((image) => ({
    id: image.id,
    url: supabase.storage.from('post-images').getPublicUrl(image.storage_path).data.publicUrl,
  }));

  const viewCount = post.organic_view_count + post.imported_view_count + post.correction_view_count;
  const upvoteCount = post.organic_upvote_count + post.imported_upvote_count + post.correction_upvote_count;
  const backHref = post.categories?.slug ? `/board/${post.categories.slug}` : '/';

  return (
    <div className="mx-auto max-w-6xl px-0 py-3 lg:flex lg:gap-6 lg:px-6 lg:py-6">
      <div className="min-w-0 flex-1 bg-white px-4 py-4 lg:rounded-md lg:border lg:border-gray-200">
        <div className="text-xs font-semibold text-brand-700">{post.categories?.name}</div>
        <h1 className="mt-1 break-words text-lg font-bold leading-snug text-gray-900">{post.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3 text-xs text-gray-500">
          <span className="max-w-[10rem] truncate">{post.author_display_name}</span>
          <span>{format(new Date(post.created_at), 'yyyy.MM.dd HH:mm')}</span>
          <span>조회 {viewCount}</span>
          <span>추천 {upvoteCount}</span>
        </div>

        <div className="whitespace-pre-wrap break-words py-4 text-[15px] leading-7 text-gray-800">
          {post.content}
        </div>

        {imageUrls.length > 0 && (
          <div className="space-y-3 pb-2">
            {imageUrls.map((image) => (
              <div key={image.id} className="relative aspect-video w-full overflow-hidden rounded-md bg-gray-100">
                <Image src={image.url} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="object-contain" />
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
            <Link
              href={`/post/${post.id}/edit`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              수정
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        )}

        <div className="mt-4 rounded-md border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
          댓글 기능은 준비 중입니다.
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <Link href={backHref} className="text-sm text-gray-600 hover:text-brand-700">
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>

      <Sidebar />
    </div>
  );
}
