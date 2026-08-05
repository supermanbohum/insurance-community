import Link from 'next/link';
import { History } from 'lucide-react';
import { listAuditLogsPage, formatAuditAction } from '@/lib/admin/audit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** 관리자 작업 로그 - 대시보드의 "최근 활동"(10개)과 달리 전체 이력을 페이지네이션으로
 * 훑어볼 수 있다. 열람권 지급/방문자수 보정/게시글·댓글 조치/신고 처리/회원 차단 등
 * 이번에 추가된 모든 관리자 액션이 여기 함께 쌓인다(각 RPC가 audit_logs에 직접 기록). */
export default async function AdminAuditLogPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { items, totalCount, pageSize } = await listAuditLogsPage(page);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">관리자 작업 로그</h1>
        <p className="text-sm text-muted-foreground">모든 관리자의 작업 내역을 시간순으로 확인합니다. (총 {totalCount.toLocaleString()}건)</p>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {items.length === 0 ? (
            <p className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <History className="h-6 w-6" />
              기록된 활동이 없습니다.
            </p>
          ) : (
            items.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{log.adminName}</span>
                    <span className="text-muted-foreground"> · {formatAuditAction(log)}</span>
                  </p>
                  {log.reasonDetail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{log.reasonDetail}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link href={`/admin/audit-log?page=${Math.max(1, page - 1)}`} aria-disabled={page <= 1}>
            <Button variant="outline" size="sm" disabled={page <= 1}>
              이전
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Link href={`/admin/audit-log?page=${Math.min(totalPages, page + 1)}`} aria-disabled={page >= totalPages}>
            <Button variant="outline" size="sm" disabled={page >= totalPages}>
              다음
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
