import { notFound } from 'next/navigation';
import {
  getBranchById,
  getBranchContacts,
  getBranchInsurerIds,
  getBranchMedia,
  getBranchRecruits,
  listInsurers,
  listRegions,
} from '@/lib/admin/branch';
import { getGaCompanyById, getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { computeBranchCompleteness } from '@/lib/admin/completeness';
import { createAdminClient } from '@/lib/supabase/admin';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { BranchCompletenessCard } from '@/components/admin/BranchCompletenessCard';
import { BranchEditWorkspace } from '@/components/admin/BranchEditWorkspace';
import { Badge } from '@/components/ui/badge';

export default async function AdminBranchDetailPage({ params }: { params: { branchId: string } }) {
  const branch = await getBranchById(params.branchId);
  if (!branch) {
    notFound();
  }

  const [gaCompany, regions, insurers, media, contacts, recruits, insurerIds, gaBranches] = await Promise.all([
    getGaCompanyById(branch.ga_company_id),
    listRegions(),
    listInsurers(),
    getBranchMedia(branch.id),
    getBranchContacts(branch.id),
    getBranchRecruits(branch.id),
    getBranchInsurerIds(branch.id),
    getBranchesByGaCompanyId(branch.ga_company_id),
  ]);
  const gaBranchCount = gaBranches.filter((b) => b.status === 'visible').length;

  const completeness = computeBranchCompleteness({
    branch,
    hasMainImage: media.some((m) => m.media_type === 'image_main'),
    contactCount: contacts.length,
    insurerCount: insurerIds.length,
    hasActiveRecruit: recruits.some((r) => r.is_active),
  });

  const imageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;
  const gaCompanyLogoUrl = !gaCompany?.logo_path
    ? null
    : IS_MOCK_MODE
      ? gaCompany.logo_path
      : createAdminClient().storage.from('company-logos').getPublicUrl(gaCompany.logo_path).data.publicUrl;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{branch.name}</h1>
          <Badge variant={branch.status === 'visible' ? 'success' : 'secondary'}>
            {branch.status === 'visible' ? '공개' : '비공개'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{gaCompany?.name ?? '소속 GA 없음'}</p>
      </div>

      <BranchCompletenessCard result={completeness} />

      <BranchEditWorkspace
        branch={branch}
        gaCompanyName={gaCompany?.name ?? ''}
        gaCompanyLogoUrl={gaCompanyLogoUrl}
        isGaVerified={gaCompany?.is_verified ?? false}
        gaBranchCount={gaBranchCount}
        regions={regions}
        insurers={insurers}
        media={media}
        contacts={contacts}
        recruits={recruits}
        insurerIds={insurerIds}
        imageBaseUrl={imageBaseUrl}
      />
    </div>
  );
}
