import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTopDesignerCertificationDetail } from '@/lib/admin/top-designer';
import { STAR_TIER_LABEL } from '@/lib/top-designer/labels';
import { TopDesignerReviewActions } from '@/components/admin/TopDesignerReviewActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  on_hold: 'secondary',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  on_hold: '보류',
  approved: '승인됨',
  rejected: '반려됨',
};

export default async function AdminTopDesignerDetailPage({ params }: { params: { id: string } }) {
  const detail = await getTopDesignerCertificationDetail(params.id);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/top-designer" className="hover:underline">
              TOP 설계사 인증
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
            {detail.starTier && <Badge variant="outline">{STAR_TIER_LABEL[detail.starTier]}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{new Date(detail.createdAt).toLocaleString('ko-KR')}에 신청</p>
        </div>
        <TopDesignerReviewActions
          certificationId={detail.id}
          plannerName={detail.name}
          status={detail.status}
          ocrExtractedIncomeKrw={detail.ocrExtractedIncomeKrw}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">신청 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="소속 GA" value={detail.gaCompanyName} />
          <InfoRow label="본부/지점" value={detail.branchName ?? '-'} />
          <InfoRow label="직급" value={detail.jobTitle} />
          <InfoRow label="연락처" value={detail.applicantContact} />
          <InfoRow label="이메일" value={detail.applicantEmail} />
          <InfoRow label="신고 연봉" value={detail.declaredAnnualIncomeKrw ? `${detail.declaredAnnualIncomeKrw.toLocaleString()}원` : '-'} />
          <InfoRow label="확정 연봉" value={detail.confirmedAnnualIncomeKrw ? `${detail.confirmedAnnualIncomeKrw.toLocaleString()}원` : '-'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">증빙 서류</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">원천징수영수증 (소득 증명)</p>
            {detail.documentUrl ? (
              <a href={detail.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                문서 열기 (10분간 유효)
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                {detail.status === 'approved' || detail.status === 'rejected' ? '심사 완료로 파기됨' : '문서를 불러올 수 없습니다.'}
              </p>
            )}
            {detail.status === 'pending_review' || detail.status === 'on_hold' ? (
              <p className="mt-1 text-[11px] text-amber-700">⚠️ 주민등록번호가 보이면 반려하고 마스킹 후 재제출을 요청하세요.</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">명함 (소속·직급 증명)</p>
            {detail.businessCardUrl ? (
              <a href={detail.businessCardUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                명함 열기 (10분간 유효)
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                {detail.status === 'approved' || detail.status === 'rejected' ? '심사 완료로 파기됨' : '문서를 불러올 수 없습니다.'}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            OCR 인식: {detail.ocrStatus === 'completed' && detail.ocrExtractedIncomeKrw
              ? `${detail.ocrExtractedIncomeKrw.toLocaleString()}원 (신뢰도 ${detail.ocrConfidence ?? '-'})`
              : '미실행 (참고용 - 관리자가 직접 확인 후 확정)'}
          </p>
        </CardContent>
      </Card>

      {detail.reviewReason && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">심사 사유</CardTitle>
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
