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

function ComingSoon({ label }: { label: string }) {
  return <p className="py-3 text-center text-xs text-ink-faint">{label} 기능은 준비 중입니다.</p>;
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

      <SidebarBox title="실시간 인기글">
        <ComingSoon label="실시간 인기글" />
      </SidebarBox>

      <SidebarBox title="인기 검색어">
        <ComingSoon label="인기 검색어" />
      </SidebarBox>

      <SidebarBox title="최근 댓글">
        <ComingSoon label="최근 댓글" />
      </SidebarBox>

      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-line text-xs text-ink-faint">
        광고 영역
      </div>
    </aside>
  );
}
