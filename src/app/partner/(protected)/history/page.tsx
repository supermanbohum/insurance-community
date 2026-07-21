import { requirePartner } from '@/lib/partner/session';
import { listChangeRequests } from '@/lib/change-requests';
import { ChangeHistoryList } from '@/components/partner/ChangeHistoryList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PartnerHistoryPage() {
  const partner = await requirePartner();
  const items = await listChangeRequests({ gaCompanyId: partner.ga_company_id! });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">변경 이력</h1>
        <p className="mt-1 text-sm text-muted-foreground">신청한 모든 수정 건의 처리 상태와 결과입니다.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">전체 이력 ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeHistoryList items={items} showTarget />
        </CardContent>
      </Card>
    </div>
  );
}
