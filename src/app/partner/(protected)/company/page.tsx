import { notFound } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { getGaCompanyById } from '@/lib/admin/ga';
import { listChangeRequests } from '@/lib/change-requests';
import { CompanyForm } from '@/components/partner/CompanyForm';
import { Card, CardContent } from '@/components/ui/card';

export default async function PartnerCompanyPage() {
  const partner = await requirePartner();
  const company = await getGaCompanyById(partner.ga_company_id!);
  if (!company) notFound();

  const pending = await listChangeRequests({ gaCompanyId: company.id, status: 'pending' });
  const pendingCompanyChange = pending.find((r) => r.targetType === 'ga_company');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">GA 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {company.approval_status === 'approved'
            ? '공개 중인 GA입니다. 수정하면 관리자 승인 후 반영돼요.'
            : '아직 공개 전이라 수정 즉시 반영됩니다.'}
        </p>
      </div>

      {pendingCompanyChange && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            검토 대기 중인 수정 신청이 있습니다. 관리자 승인 전까지 기존 정보가 유지됩니다.
          </CardContent>
        </Card>
      )}

      <CompanyForm company={company} />
    </div>
  );
}
