import Link from 'next/link';
import { getPostListPage } from '@/lib/posts/query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/post/PostCard';
import { Pagination } from '@/components/post/Pagination';
import { Sidebar } from '@/components/layout/Sidebar';

export const dynamic = 'force-dynamic';

async function getCategories() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('categories')
    .select('slug, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? '1') || 1;
  const [{ summaries, totalPages }, categories] = await Promise.all([getPostListPage({ page }), getCategories()]);

  return (
    <div className="mx-auto max-w-6xl px-0 py-3 lg:flex lg:gap-6 lg:px-6 lg:py-6">
      <div className="min-w-0 flex-1 bg-white lg:rounded-md lg:border lg:border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 lg:border-b-0">
          <h1 className="text-lg font-bold text-gray-900">커뮤니티</h1>
          <Link
            href="/write"
            className="hidden rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 lg:inline-block"
          >
            글쓰기
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2.5">
          <Link href="/community" className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/board/${c.slug}`}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
            >
              {c.name}
            </Link>
          ))}
          <Link href="/best" className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200">
            베스트
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
          <Pagination basePath="/community" currentPage={page} totalPages={totalPages} />
        </div>
      </div>

      <Sidebar />
    </div>
  );
}
