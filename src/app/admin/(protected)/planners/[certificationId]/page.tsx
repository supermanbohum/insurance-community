import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { getPlannerCertificationDetail } from '@/lib/admin/planners';
import { INCOME_TIER_SHORT_LABEL, PLANNER_STATUS_LABEL } from '@/lib/planners/tier';
import { PlannerCertificationReviewActions } from '@/components/admin/PlannerCertificationReviewActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  pending_renewal: 'warning',
  rejected: 'destructive',
  expiring_soon: 'warning',
  expired: 'destructive',
  approved: 'success',
};

const EVENT_LABEL: Record<string, string> = {
  initial_approval: '최초 승인',
  renewal_approval: '재인증 승인',
  rejection: '반려',
};

export default async function AdminPlannerDetailPage({ params }: { params: { certificationId: string } }) {
  const detail = await getPlannerCertificationDetail(params.certificationId);
  if (!detail) notFound();

  const canReview = detail.status === 'pending_review' || detail.status === 'pending_renewal';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/planners" className="hover:underline">
              고소득 설계사
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.plannerName}</h1>
            <Badge variant={STATUS_VARIANT[detail.displayStatus]}>{PLANNER_STATUS_LABEL[detail.displayStatus]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.gaCompanyName} · {detail.branchName} · {detail.submittedByName}님이 {new Date(detail.createdAt).toLocaleString('ko-KR')}에 신청
          </p>
        </div>
        {canReview && <PlannerCertificationReviewActions certificationId={detail.id} plannerName={detail.plannerName} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">설계사 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="이름" value={detail.plannerName} />
          <InfoRow label="연락처" value={detail.plannerPhone} />
          <InfoRow label="회사" value={detail.plannerCompany} />
          <InfoRow label="직책" value={detail.jobTitle} />
          <InfoRow label="연봉 구간" value={INCOME_TIER_SHORT_LABEL[detail.incomeTier]} />
          <InfoRow label="만료일" value={detail.expiresAt ? new Date(detail.expiresAt).toLocaleDateString('ko-KR') : '-'} />
        </CardContent>
      </Card>

      {detail.withholdingDocUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">첨부 서류</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={detail.withholdingDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <FileText className="h-4 w-4" />
              원천징수영수증 보기
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">인증 이력</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {detail.history.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">이력이 없습니다.</p>
          ) : (
            detail.history.map((h) => (
              <div key={h.id} className="flex flex-col gap-1 px-6 py-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {EVENT_LABEL[h.eventType]} · {INCOME_TIER_SHORT_LABEL[h.incomeTier]}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(h.effectiveFrom).toLocaleString('ko-KR')}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  승인 관리자: {h.approvedByName ?? '-'}
                  {h.effectiveUntil && ` · 유효기간: ~${new Date(h.effectiveUntil).toLocaleDateString('ko-KR')}`}
                </p>
                {h.approvalMemo && <p className="text-xs text-muted-foreground">메모: {h.approvalMemo}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
