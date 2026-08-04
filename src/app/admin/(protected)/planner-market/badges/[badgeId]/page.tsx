import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlannerBadgeDetail } from '@/lib/admin/planner-badges';
import { PlannerBadgeReviewActions } from '@/components/admin/PlannerBadgeReviewActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  approved: '승인됨',
  rejected: '반려됨',
};

export default async function AdminPlannerMarketBadgeDetailPage({ params }: { params: { badgeId: string } }) {
  const detail = await getPlannerBadgeDetail(params.badgeId);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/planner-market/badges" className="hover:underline">
              설계사 마켓 - 배지
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {detail.plannerName} · {detail.badgeIcon} {detail.badgeLabel}
            </h1>
            <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{new Date(detail.createdAt).toLocaleString('ko-KR')} 신청</p>
        </div>
        <PlannerBadgeReviewActions badgeId={detail.id} plannerName={detail.plannerName} badgeLabel={detail.badgeLabel} status={detail.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">증빙 서류</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.documentUrl ? (
            <a href={detail.documentUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:underline">
              서류 열기 (10분간 유효한 링크)
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">서류가 필요 없는 배지이거나 등록된 서류가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {detail.reviewReason && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">반려 사유</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{detail.reviewReason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
