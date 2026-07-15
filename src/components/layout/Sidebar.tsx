import Link from 'next/link';
import { getPostListPage } from '@/lib/posts/query';

function SidebarBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function ComingSoon({ label }: { label: string }) {
  return <p className="py-3 text-center text-xs text-gray-400">{label} 기능은 준비 중입니다.</p>;
}

export async function Sidebar() {
  const { summaries: noticePosts } = await getPostListPage({ categorySlug: 'notice', page: 1 });
  const topNotices = noticePosts.slice(0, 3);

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-3 lg:flex">
      <SidebarBox title="공지사항">
        {topNotices.length === 0 ? (
          <p className="py-3 text-center text-xs text-gray-400">등록된 공지가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {topNotices.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/post/${post.id}`}
                  className="block truncate text-sm text-gray-700 hover:text-brand-700"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SidebarBox>

      <SidebarBox title="실시간 인기글">
        <ComingSoon label="실시간 인기글" />
      </SidebarBox>

      <SidebarBox title="인기 검색어">
        <ComingSoon label="인기 검색어" />
      </SidebarBox>

      <SidebarBox title="최근 댓글">
        <ComingSoon label="최근 댓글" />
      </SidebarBox>

      <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400">
        광고 영역
      </div>
    </aside>
  );
}
