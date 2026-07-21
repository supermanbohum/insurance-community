import Link from 'next/link';
import { requirePartner } from '@/lib/partner/session';
import { getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { listRegions } from '@/lib/admin/branch';
import { PartnerBranchCreateForm } from '@/components/partner/PartnerBranchCreateForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function PartnerBranchesPage() {
  const partner = await requirePartner();
  const [branches, regions] = await Promise.all([
    getBranchesByGaCompanyId(partner.ga_company_id!),
    listRegions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">지점 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">지점 정보는 저장 시점의 승인 상태에 따라 즉시 반영되거나 수정 신청으로 대기합니다.</p>
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
              <Link key={b.id} href={`/partner/branches/${b.id}`} className="flex items-center justify-between gap-3 px-6 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{b.name}</span>
                <Badge variant={b.status === 'visible' ? 'success' : 'warning'}>
                  {b.status === 'visible' ? '공개' : '비공개(검토중)'}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">신규 지점 추가</h2>
        <PartnerBranchCreateForm regions={regions} />
      </div>
    </div>
  );
}
