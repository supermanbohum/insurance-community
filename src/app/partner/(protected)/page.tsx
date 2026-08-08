import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { getGaCompanyById, getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { listChangeRequests, countPendingChangeRequests } from '@/lib/change-requests';
import { getMyIncompleteBranchRegistrationAction } from '@/lib/actions/partner';
import { APPROVAL_STATUS_BADGE_VARIANT, APPROVAL_STATUS_LABEL } from '@/lib/admin/approval-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangeHistoryList } from '@/components/partner/ChangeHistoryList';
import { PartnerStepIndicator } from '@/components/partner/PartnerStepIndicator';

const MIN_OFFICE_PHOTOS = 3;

export default async function PartnerDashboardPage() {
  const partner = await requirePartner();
  const company = await getGaCompanyById(partner.ga_company_id!);
  if (!company) notFound();

  const [branches, pendingCount, recentHistory, incompleteRegistration] = await Promise.all([
    getBranchesByGaCompanyId(company.id),
    countPendingChangeRequests(company.id),
    listChangeRequests({ gaCompanyId: company.id }),
    getMyIncompleteBranchRegistrationAction(),
  ]);

  const missingItems = incompleteRegistration
    ? [
        !incompleteRegistration.hasMainPhoto && '대표사진 1장',
        incompleteRegistration.officePhotoCount < MIN_OFFICE_PHOTOS &&
          `사무실 사진 ${MIN_OFFICE_PHOTOS - incompleteRegistration.officePhotoCount}장`,
      ].filter((v): v is string => Boolean(v))
    : [];

  return (
    <div className="flex flex-col gap-6">
      {incompleteRegistration && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-bold text-amber-900">{incompleteRegistration.branchName} 등록을 마무리하세요</p>
              <p className="mt-0.5 text-sm text-amber-800">
                {missingItems.length > 0 ? `남은 것: ${missingItems.join(', ')}` : '사진 확인 후 승인 요청을 보낼 수 있어요.'}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/partner/register/continue">이어서 작성</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <PartnerStepIndicator status={company.approval_status} />
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{company.name}</h1>
          <Badge variant={APPROVAL_STATUS_BADGE_VARIANT[company.approval_status]}>
            {APPROVAL_STATUS_LABEL[company.approval_status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {company.approval_status === 'pending' && '운영팀 승인을 기다리고 있습니다. 승인 전에는 정보를 자유롭게 수정할 수 있어요.'}
          {company.approval_status === 'approved' && '공개 중입니다. 이제부터의 수정은 운영팀 승인 후 반영됩니다.'}
          {company.approval_status === 'rejected' && `반려되었습니다.${company.approval_reason ? ` 사유: ${company.approval_reason}` : ''}`}
          {company.approval_status === 'suspended' && `노출이 중지되었습니다.${company.approval_reason ? ` 사유: ${company.approval_reason}` : ''}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">지점 수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{branches.length}곳</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">검토 대기 중인 변경 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingCount}건</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">지점 목록</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {branches.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">등록된 지점이 없습니다.</p>
          ) : (
            branches.map((b) => (
              <Link key={b.id} href={`/partner/branches/${b.id}`} className="flex items-center justify-between px-6 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{b.name}</span>
                <span className="text-muted-foreground">{b.status === 'visible' ? '공개' : b.status === 'hidden' ? '비공개(검토중)' : '-'}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeHistoryList items={recentHistory.slice(0, 5)} />
        </CardContent>
      </Card>
    </div>
  );
}
