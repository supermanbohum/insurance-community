import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PenLine } from 'lucide-react';
import { getPostListPage } from '@/lib/posts/query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/post/PostCard';
import { CommunityTabs } from '@/components/post/CommunityTabs';
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
  const [{ data: category }, { data: categories }] = await Promise.all([
    supabase.from('categories').select('name').eq('slug', params.category).eq('is_active', true).single(),
    supabase.from('categories').select('slug, name').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);

  if (!category) {
    notFound();
  }

  const page = Number(searchParams.page ?? '1') || 1;
  const { summaries, totalPages } = await getPostListPage({ categorySlug: params.category, page });
  const basePath = `/board/${params.category}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold tracking-tight text-ink">{category.name}</h1>
          <Link
            href="/write"
            className="flex items-center gap-1 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-card transition-colors hover:bg-brand-700"
          >
            <PenLine className="h-3.5 w-3.5" />
            글쓰기
          </Link>
        </div>

        <CommunityTabs categories={categories ?? []} activeSlug={params.category} />

        {summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line py-16 text-ink-faint">
            <p className="text-sm">아직 작성된 글이 없습니다. 첫 글을 남겨보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {summaries.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} />
      </div>

      <Sidebar />
    </div>
  );
}
