import { redirect } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { getGaCompanyById } from '@/lib/admin/ga';
import { PartnerShell } from '@/components/partner/PartnerShell';

export default async function PartnerProtectedLayout({ children }: { children: React.ReactNode }) {
  const partner = await requirePartner();
  if (!partner.ga_company_id) {
    redirect('/partner/onboarding');
  }

  const company = await getGaCompanyById(partner.ga_company_id);

  return (
    <PartnerShell partnerName={partner.display_name} approvalStatus={company?.approval_status ?? null}>
      {children}
    </PartnerShell>
  );
}
