import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getChangeRequestDetail } from '@/lib/change-requests';
import { ChangeRequestReviewActions } from '@/components/admin/ChangeRequestReviewActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABEL: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '반려됨',
  changes_requested: '수정 요청됨',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  changes_requested: 'outline',
};

export default async function AdminChangeRequestDetailPage({ params }: { params: { requestId: string } }) {
  const request = await getChangeRequestDetail(params.requestId);
  if (!request) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/change-requests" className="hover:underline">
              변경 요청
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {request.gaCompanyName}
              {request.targetType === 'ga_branch' && ` · ${request.targetName}`}
            </h1>
            <Badge variant={STATUS_VARIANT[request.status]}>{STATUS_LABEL[request.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.submittedByName}님이 {new Date(request.createdAt).toLocaleString('ko-KR')}에 신청
          </p>
        </div>
        {request.status === 'pending' && (
          <ChangeRequestReviewActions requestId={request.id} targetName={request.targetName} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">변경 내용 ({request.fieldChanges.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {request.fieldChanges.map((f) => (
            <div key={f.field} className="rounded-md border p-3">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{f.label}</p>
              {f.kind === 'image' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <ImageThumb label="기존" value={f.oldValue} />
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <ImageThumb label="변경 후" value={f.newValue} />
                </div>
              ) : f.field === '_create' ? (
                <p className="text-sm font-medium">{f.newValue}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-destructive/10 px-2 py-1 text-destructive line-through">{f.oldValue}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-800">{f.newValue}</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {request.status !== 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">처리 내역</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium">{STATUS_LABEL[request.status]}</span>
              {' · '}
              처리 관리자: {request.reviewedByName ?? '알 수 없음'}
              {' · '}
              {request.reviewedAt && new Date(request.reviewedAt).toLocaleString('ko-KR')}
            </p>
            {request.reviewReason && <p className="text-muted-foreground">사유: {request.reviewReason}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ImageThumb({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-muted-foreground">없음</span>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
