import Link from 'next/link';
import { listAdminReports } from '@/lib/admin/community';
import { CommunityAdminTabs } from '@/components/admin/CommunityAdminTabs';
import { ReportResolutionDialog } from '@/components/admin/ReportResolutionDialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const REASON_LABEL: Record<string, string> = {
  privacy: '개인정보 노출',
  abuse: '욕설/비방',
  spam: '스팸/광고',
  misinformation: '허위정보',
  solicitation_violation: '영업/모집 위반',
  illegal: '불법행위',
  other: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '처리 대기',
  resolved_normal: '반려',
  resolved_hidden: '숨김 처리됨',
  resolved_deleted: '삭제 처리됨',
  resolved_ban: '작성자 차단됨',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  resolved_normal: 'secondary',
  resolved_hidden: 'outline',
  resolved_deleted: 'destructive',
  resolved_ban: 'destructive',
};

export default async function AdminCommunityReportsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status ?? 'pending';
  const reports = await listAdminReports({ status: status === 'all' ? undefined : status });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">커뮤니티 관리</h1>
        <p className="text-sm text-muted-foreground">신고된 게시글/댓글을 확인하고 처리합니다.</p>
      </div>

      <CommunityAdminTabs active="reports" />

      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {[
          { key: 'pending', label: '처리 대기' },
          { key: 'all', label: '전체' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/admin/community/reports?status=${t.key}`}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', status === t.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {reports.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">신고 내역이 없습니다.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    <Badge variant="outline">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                    <p className="truncate text-sm font-medium">{r.targetTitle}</p>
                  </div>
                  {r.detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.detail}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.targetHref && (
                    <a href={r.targetHref} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      게시글 보기
                    </a>
                  )}
                  {r.status === 'pending' && (
                    <ReportResolutionDialog reportId={r.id} targetHref={r.targetHref} targetAuthorId={r.targetAuthorId} />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
