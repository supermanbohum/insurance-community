import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlannerMarketProfileDetail } from '@/lib/admin/planner-market';
import { JOB_SEARCH_STATUS_LABEL, DESIRED_START_TIMING_LABEL, CONTACTABLE_TIME_LABEL } from '@/lib/planner-market/labels';
import { listPlannerBadgeTypes } from '@/lib/admin/planner-badges';
import { PlannerMarketProfileReviewActions } from '@/components/admin/PlannerMarketProfileReviewActions';
import { PlannerBadgeManagementCard } from '@/components/admin/PlannerBadgeManagementCard';
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

export default async function AdminPlannerMarketProfileDetailPage({ params }: { params: { profileId: string } }) {
  const [detail, badgeTypes] = await Promise.all([getPlannerMarketProfileDetail(params.profileId), listPlannerBadgeTypes()]);
  if (!detail) notFound();

  const canReview = detail.status === 'pending_review';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/planner-market" className="hover:underline">
              설계사 마켓 - 설계사 등록
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(detail.createdAt).toLocaleString('ko-KR')} 신청 · 회원 {detail.memberNickname}
            {detail.memberUsername ? ` (${detail.memberUsername})` : ''}
          </p>
        </div>
        {canReview && <PlannerMarketProfileReviewActions profileId={detail.id} plannerName={detail.name} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">비공개 정보 (연락처)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="이름" value={detail.name} />
          <InfoRow label="휴대폰" value={detail.phone} />
          <InfoRow label="이메일" value={detail.email} />
          <InfoRow label="카카오톡" value={detail.kakaoId ?? '-'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">공개 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="활동지역" value={detail.activeRegionLabel || '-'} />
          <InfoRow label="경력" value={`${detail.careerYears}년`} />
          <InfoRow label="전문분야" value={detail.specialties.length > 0 ? detail.specialties.join(', ') : '-'} />
          <InfoRow label="현재 근무 여부" value={detail.currentlyEmployed ? '재직중' : '미재직'} />
          <InfoRow label="현재 상태" value={JOB_SEARCH_STATUS_LABEL[detail.jobSearchStatus]} />
          <InfoRow label="희망 입사 시기" value={detail.desiredStartTiming ? DESIRED_START_TIMING_LABEL[detail.desiredStartTiming] : '-'} />
          <InfoRow
            label="연락 가능 시간"
            value={
              detail.contactableTimes.length > 0
                ? detail.contactableTimes.map((t) => CONTACTABLE_TIME_LABEL[t as keyof typeof CONTACTABLE_TIME_LABEL] ?? t).join(', ')
                : '-'
            }
          />
          <InfoRow label="희망 근무지역" value={detail.desiredRegionLabel ?? '-'} />
          <InfoRow label="희망 GA" value={detail.desiredGaCompanyName ?? '-'} />
          <InfoRow label="희망 조건" value={detail.desiredConditions ?? '-'} />
        </CardContent>
        {detail.selfIntroduction && (
          <CardContent className="border-t pt-4">
            <p className="mb-1 text-xs text-muted-foreground">자기소개</p>
            <p className="whitespace-pre-line text-sm">{detail.selfIntroduction}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">동의 항목</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <ConsentRow label="연락처 유료 열람 동의" checked={detail.consents.contactPaidView} />
          <ConsentRow label="채용목적 연락 동의" checked={detail.consents.recruitContact} />
          <ConsentRow label="개인정보 처리방침 동의" checked={detail.consents.privacyPolicy} />
          <ConsentRow label="개인정보 제3자 제공 동의" checked={detail.consents.thirdPartyShare} />
          <ConsentRow label="철회 가능 고지 확인" checked={detail.consents.withdrawalNotice} />
        </CardContent>
      </Card>

      <PlannerBadgeManagementCard plannerProfileId={detail.id} badges={detail.allBadges} badgeTypes={badgeTypes} />

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

function ConsentRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span>{checked ? '✅' : '❌'}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
