import Link from 'next/link';
import { getPostListPage } from '@/lib/posts/query';

function SidebarBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
      <h2 className="mb-2 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export async function Sidebar() {
  const { summaries: noticePosts } = await getPostListPage({ categorySlug: 'notice', page: 1 });
  const topNotices = noticePosts.slice(0, 3);

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-3 lg:flex">
      <SidebarBox title="공지사항">
        {topNotices.length === 0 ? (
          <p className="py-3 text-center text-xs text-ink-faint">등록된 공지가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {topNotices.map((post) => (
              <li key={post.id}>
                <Link href={`/post/${post.id}`} className="block truncate text-sm text-ink-soft hover:text-brand-600">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SidebarBox>
    </aside>
  );
}
