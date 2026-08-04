import { requirePartner } from '@/lib/partner/session';
import { getGaCompanyById } from '@/lib/admin/ga';
import { PartnerShell } from '@/components/partner/PartnerShell';

/** 광고 상품 카탈로그는 아직 등록된 지점이 없어도 둘러볼 수 있어야 한다(구매만
 * 승인된 지점이 있어야 가능 - AdProductCatalog가 이미 그 상태를 안내한다). 그래서
 * /partner/(protected) 그룹의 "ga_company_id 없으면 /partner/register로 강제 이동"
 * 게이트를 여기서는 쓰지 않고 로그인 세션 확인만 한다 - "광고상품" 메뉴를 눌렀는데
 * 지점등록 화면으로 튕기는 문제를 근본적으로 없앤다. */
export default async function PartnerAdProductsLayout({ children }: { children: React.ReactNode }) {
  const partner = await requirePartner();
  const company = partner.ga_company_id ? await getGaCompanyById(partner.ga_company_id) : null;

  return (
    <PartnerShell partnerName={partner.display_name} approvalStatus={company?.approval_status ?? null}>
      {children}
    </PartnerShell>
  );
}
