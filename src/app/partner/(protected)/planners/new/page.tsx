import { redirect } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { PlannerCertificationForm } from '@/components/partner/PlannerCertificationForm';

export default async function NewPlannerCertificationPage() {
  const partner = await requirePartner();
  const branches = await getBranchesByGaCompanyId(partner.ga_company_id!);
  const approvedBranches = branches.filter((b) => b.registration_status === 'approved');

  if (approvedBranches.length === 0) {
    redirect('/partner/planners');
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">고소득 설계사 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">등록 완료 후 운영팀 승인을 거쳐 인증됩니다.</p>
      </div>
      <PlannerCertificationForm branches={approvedBranches.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
