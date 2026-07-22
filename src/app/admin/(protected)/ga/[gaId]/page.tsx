import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, MapPin } from 'lucide-react';
import { getGaCompanyById, getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { listChangeRequests, countPendingChangeRequests } from '@/lib/change-requests';
import { APPROVAL_STATUS_BADGE_VARIANT, APPROVAL_STATUS_LABEL } from '@/lib/admin/approval-status';
import { GaApprovalActions } from '@/components/admin/GaApprovalActions';
import { GaEditWorkspace } from '@/components/admin/GaEditWorkspace';
import { ChangeHistoryList } from '@/components/partner/ChangeHistoryList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminGaDetailPage({ params }: { params: { gaId: string } }) {
  const ga = await getGaCompanyById(params.gaId);
  if (!ga) {
    notFound();
  }

  const [branches, pendingCount, history] = await Promise.all([
    getBranchesByGaCompanyId(ga.id),
    countPendingChangeRequests(ga.id),
    listChangeRequests({ gaCompanyId: ga.id }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{ga.name}</h1>
            <Badge variant={APPROVAL_STATUS_BADGE_VARIANT[ga.approval_status]}>
              {APPROVAL_STATUS_LABEL[ga.approval_status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">slug: {ga.slug}</p>
          {ga.approval_reason && (
            <p className="mt-1 text-sm text-destructive">사유: {ga.approval_reason}</p>
          )}
          {pendingCount > 0 && (
            <Link href={`/admin/change-requests?status=pending`} className="mt-1 inline-block">
              <Badge variant="warning">검토 대기 중인 변경 요청 {pendingCount}건</Badge>
            </Link>
          )}
        </div>
        <GaApprovalActions gaCompanyId={ga.id} gaName={ga.name} status={ga.approval_status} size="default" />
      </div>

      <GaEditWorkspace ga={ga} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">지점 ({branches.length})</CardTitle>
          <Link href={`/admin/branches/new?gaCompanyId=${ga.id}`}>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              지점 추가
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {branches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">등록된 지점이 없습니다.</p>
          ) : (
            branches.map((branch) => (
              <Link
                key={branch.id}
                href={`/admin/branches/${branch.id}`}
                className="flex items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-accent"
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                <Badge variant={branch.status === 'visible' ? 'success' : 'secondary'}>
                  {branch.status === 'visible' ? '공개' : branch.status === 'hidden' ? '비공개' : '삭제됨'}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeHistoryList items={history.slice(0, 10)} showTarget />
        </CardContent>
      </Card>
    </div>
  );
}
