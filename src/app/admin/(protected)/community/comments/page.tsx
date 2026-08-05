import { listAdminComments } from '@/lib/admin/community';
import { CommunityAdminTabs } from '@/components/admin/CommunityAdminTabs';
import { CommentModerationActions } from '@/components/admin/CommentModerationActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  visible: 'success',
  hidden: 'warning',
  deleted: 'destructive',
};
const STATUS_LABEL: Record<string, string> = { visible: '공개', hidden: '숨김', deleted: '삭제됨' };

export default async function AdminCommunityCommentsPage() {
  const comments = await listAdminComments();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">커뮤니티 관리</h1>
        <p className="text-sm text-muted-foreground">댓글을 삭제/숨김/복원 처리합니다.</p>
      </div>

      <CommunityAdminTabs active="comments" />

      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {comments.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">댓글이 없습니다.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    <p className="truncate text-sm">{c.content}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {c.authorDisplayName} · {c.postTitle} · {new Date(c.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <CommentModerationActions commentId={c.id} status={c.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
