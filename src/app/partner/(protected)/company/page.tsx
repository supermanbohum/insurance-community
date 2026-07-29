import { notFound } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { getGaCompanyById } from '@/lib/admin/ga';
import { CompanyForm } from '@/components/partner/CompanyForm';

export default async function PartnerCompanyPage() {
  const partner = await requirePartner();
  const company = await getGaCompanyById(partner.ga_company_id!);
  if (!company) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">GA 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">GA명/대표자/소개는 저장 즉시 반영됩니다.</p>
      </div>

      <CompanyForm company={company} />
    </div>
  );
}
