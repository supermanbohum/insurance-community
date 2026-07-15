import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostListPage } from '@/lib/posts/query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/post/PostCard';
import { Pagination } from '@/components/post/Pagination';
import { Sidebar } from '@/components/layout/Sidebar';

export const dynamic = 'force-dynamic';

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { page?: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', params.category)
    .eq('is_active', true)
    .single();

  if (!category) {
    notFound();
  }

  const page = Number(searchParams.page ?? '1') || 1;
  const { summaries, totalPages } = await getPostListPage({ categorySlug: params.category, page });
  const basePath = `/board/${params.category}`;

  return (
    <div className="mx-auto max-w-6xl px-0 py-3 lg:flex lg:gap-6 lg:px-6 lg:py-6">
      <div className="min-w-0 flex-1 bg-white lg:rounded-md lg:border lg:border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 lg:border-b-0">
          <h1 className="text-lg font-bold text-gray-900">{category.name}</h1>
          <Link
            href="/write"
            className="hidden rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 lg:inline-block"
          >
            글쓰기
          </Link>
        </div>

        {summaries.length === 0 ? (
          <div className="mx-4 my-4 rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            아직 작성된 글이 없습니다. 첫 글을 남겨보세요.
          </div>
        ) : (
          <div>
            {summaries.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        <div className="px-4">
          <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} />
        </div>
      </div>

      <Sidebar />
    </div>
  );
}
