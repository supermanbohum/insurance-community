import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBranchAdProductDetail } from '@/lib/admin/ad-products';
import { AdProductReviewActions } from '@/components/admin/AdProductReviewActions';
import { AdProductExtendDialog } from '@/components/admin/AdProductExtendDialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  expired: 'outline',
  canceled: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  approved: '승인됨',
  rejected: '반려됨',
  expired: '만료됨',
  canceled: '취소됨',
};

export default async function AdminAdProductDetailPage({ params }: { params: { id: string } }) {
  const detail = await getBranchAdProductDetail(params.id);
  if (!detail) notFound();

  const canReview = detail.status === 'pending_review';
  const canExtend = detail.status === 'approved' || detail.status === 'expired';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/ad-products" className="hover:underline">
              광고 관리
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {detail.branchName} · {detail.productLabel}
            </h1>
            <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{detail.gaCompanyName} · {new Date(detail.createdAt).toLocaleString('ko-KR')} 신청</p>
        </div>
        <div className="flex items-center gap-1.5">
          {canExtend && <AdProductExtendDialog adProductId={detail.id} currentEndAt={detail.endAt} />}
          {canReview && <AdProductReviewActions adProductId={detail.id} branchName={detail.branchName} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">광고 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="지점" value={detail.branchName} />
          <InfoRow label="GA" value={detail.gaCompanyName} />
          <InfoRow label="상품" value={detail.productLabel} />
          <InfoRow label="시작일" value={new Date(detail.startAt).toLocaleString('ko-KR')} />
          <InfoRow label="종료일" value={new Date(detail.endAt).toLocaleString('ko-KR')} />
          <InfoRow label="결제수단" value={detail.paymentMethod ?? '-'} />
          <InfoRow label="공급가액" value={detail.amountKrw !== null ? `${(detail.amountKrw - (detail.vatKrw ?? 0)).toLocaleString()}원` : '-'} />
          <InfoRow label="부가세" value={detail.vatKrw !== null ? `${detail.vatKrw.toLocaleString()}원` : '-'} />
          <InfoRow label="합계금액" value={detail.amountKrw !== null ? `${detail.amountKrw.toLocaleString()}원` : '-'} />
          <InfoRow label="결제상태" value={detail.paymentStatus ?? '-'} />
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
