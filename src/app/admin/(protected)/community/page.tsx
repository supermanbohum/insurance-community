import Link from 'next/link';
import { listAdminCategories, listAdminPosts } from '@/lib/admin/community';
import { CommunityAdminTabs } from '@/components/admin/CommunityAdminTabs';
import { PostModerationDialog } from '@/components/admin/PostModerationDialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  visible: 'success',
  hidden: 'warning',
  deleted: 'destructive',
};
const STATUS_LABEL: Record<string, string> = { visible: '공개', hidden: '숨김', deleted: '삭제됨' };

export default async function AdminCommunityPostsPage({ searchParams }: { searchParams: { category?: string } }) {
  const [categories, posts] = await Promise.all([listAdminCategories(), listAdminPosts({ categorySlug: searchParams.category })]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">커뮤니티 관리</h1>
          <p className="text-sm text-muted-foreground">게시글 상태/공지/베스트를 관리하고 작성자를 차단합니다.</p>
        </div>
        <Link
          href="/admin/community/new"
          className="shrink-0 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          운영팀 글 발행
        </Link>
      </div>

      <CommunityAdminTabs active="posts" />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/community"
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            !searchParams.category ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
          )}
        >
          전체
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/admin/community?category=${c.slug}`}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              searchParams.category === c.slug ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>조회수</TableHead>
                <TableHead>추천수</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    게시글이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-1.5">
                        {p.isNotice && <Badge variant="warning">공지</Badge>}
                        {p.isBest && <Badge variant="success">베스트</Badge>}
                        <a
                          href={`/post/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-medium hover:underline"
                        >
                          {p.title}
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.categoryName}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.authorDisplayName}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{p.viewCount.toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{p.upvoteCount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <PostModerationDialog
                        postId={p.id}
                        postTitle={p.title}
                        authorId={p.authorId}
                        status={p.status}
                        isNotice={p.isNotice}
                        isBest={p.isBest}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
