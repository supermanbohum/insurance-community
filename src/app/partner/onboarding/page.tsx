import { redirect } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { listRegions } from '@/lib/admin/branch';
import { OnboardingForm } from '@/components/partner/OnboardingForm';

export default async function PartnerOnboardingPage() {
  const partner = await requirePartner();
  if (partner.ga_company_id) {
    redirect('/partner');
  }

  const regions = await listRegions();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold">GA 등록 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          입력한 정보는 보험맵 관리자 검토 후 승인되면 공개됩니다.
        </p>
      </div>
      <OnboardingForm regions={regions} />
    </div>
  );
}
