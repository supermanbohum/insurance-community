import { notFound } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import {
  getBranchById,
  getBranchContacts,
  getBranchInsurerIds,
  getBranchRecruits,
  listInsurers,
  listRegions,
} from '@/lib/admin/branch';
import { getGaCompanyById } from '@/lib/admin/ga';
import { PartnerBranchEditForm } from '@/components/partner/PartnerBranchEditForm';
import { Card, CardContent } from '@/components/ui/card';

export default async function PartnerBranchDetailPage({ params }: { params: { branchId: string } }) {
  const partner = await requirePartner();
  const branch = await getBranchById(params.branchId);
  if (!branch || branch.ga_company_id !== partner.ga_company_id) {
    notFound();
  }

  const [company, regions, insurers, selectedInsurerIds, contacts, recruits] = await Promise.all([
    getGaCompanyById(branch.ga_company_id),
    listRegions(),
    listInsurers(),
    getBranchInsurerIds(branch.id),
    getBranchContacts(branch.id),
    getBranchRecruits(branch.id),
  ]);

  const activeRecruit = recruits.find((r) => r.is_active) ?? null;
  const isApproved = company?.approval_status === 'approved';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{branch.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {branch.status === 'hidden' ? '신규 등록 후 관리자 승인 대기 중입니다.' : '공개 중인 지점입니다.'}
        </p>
      </div>

      {isApproved && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            수정 사항은 저장 즉시 반영됩니다. 다만 지점 자체의 공개 여부는 관리자 승인 상태를 따릅니다.
          </CardContent>
        </Card>
      )}

      <PartnerBranchEditForm
        branch={branch}
        regions={regions}
        insurers={insurers}
        selectedInsurerIds={selectedInsurerIds}
        contacts={contacts}
        activeRecruit={activeRecruit}
      />
    </div>
  );
}
