import { requirePartner } from '@/lib/partner/session';
import { getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { AdProductCatalog } from '@/components/partner/AdProductCatalog';

/** 광고 상품 - 지점 노출을 위한 광고 카탈로그. 설계사 마켓(열람권)과 완전히 별개의
 * 두 번째 수익 스트림이다. 지점이 아직 없는 GA 관리자도 카탈로그는 볼 수 있다
 * (구매만 승인된 지점이 있어야 가능 - AdProductCatalog 내부에서 안내). */
export default async function PartnerAdProductsPage() {
  const partner = await requirePartner();
  const branches = partner.ga_company_id ? await getBranchesByGaCompanyId(partner.ga_company_id) : [];
  const approvedBranches = branches.filter((b) => b.registration_status === 'approved');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">광고 상품</h1>
        <p className="mt-1 text-sm text-muted-foreground">지점 노출을 위한 광고 상품을 구매합니다. 구매 후 운영팀 승인을 거쳐 노출됩니다.</p>
      </div>
      <AdProductCatalog branches={approvedBranches.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
