import { listApprovedGaCompaniesForSelect, listRegions } from '@/lib/admin/branch';
import { BranchCreateForm } from '@/components/admin/BranchCreateForm';

export default async function AdminBranchCreatePage({
  searchParams,
}: {
  searchParams: { gaCompanyId?: string };
}) {
  const [gaCompanies, regions] = await Promise.all([listApprovedGaCompaniesForSelect(), listRegions()]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">지점 생성</h1>
        <p className="text-sm text-muted-foreground">
          미디어·연락처·채용 정보는 생성 후 상세 화면에서 추가할 수 있습니다.
        </p>
      </div>
      <BranchCreateForm gaCompanies={gaCompanies} regions={regions} defaultGaCompanyId={searchParams.gaCompanyId} />
    </div>
  );
}
