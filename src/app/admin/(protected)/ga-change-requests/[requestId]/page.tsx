import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGaChangeRequestDetail } from '@/lib/admin/ga-change-requests';
import { GaChangeRequestReviewActions } from '@/components/admin/GaChangeRequestReviewActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중',
  approved: '승인됨',
  rejected: '반려됨',
};

export default async function AdminGaChangeRequestDetailPage({ params }: { params: { requestId: string } }) {
  const detail = await getGaChangeRequestDetail(params.requestId);
  if (!detail) notFound();

  const canReview = detail.status === 'pending';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/ga-change-requests" className="hover:underline">
              GA 변경 요청
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.memberName}</h1>
            <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(detail.createdAt).toLocaleString('ko-KR')}에 신청
          </p>
        </div>
        {canReview && <GaChangeRequestReviewActions requestId={detail.id} memberName={detail.memberName} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">회원 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="이름" value={detail.memberName} />
          <InfoRow label="아이디" value={detail.memberUsername ?? '-'} />
          <InfoRow label="이메일" value={detail.memberEmail ?? '-'} />
          <InfoRow label="연락처" value={detail.memberContact ?? '-'} />
          <InfoRow label="현재 소속 GA" value={detail.currentGaName ?? '미지정'} />
          <InfoRow label="변경 요청 GA" value={detail.requestedGaName} />
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
