import { notFound } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getBranchById,
  getBranchContacts,
  getBranchInsurerIds,
  getBranchMedia,
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

  const supabase = createServerSupabaseClient();
  const [company, regions, insurers, selectedInsurerIds, contacts, recruits, media, pendingUpdates] = await Promise.all([
    getGaCompanyById(branch.ga_company_id),
    listRegions(),
    listInsurers(),
    getBranchInsurerIds(branch.id),
    getBranchContacts(branch.id),
    getBranchRecruits(branch.id),
    getBranchMedia(branch.id),
    supabase
      .from('branch_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branch.id)
      .eq('request_type', 'update')
      .eq('status', 'pending'),
  ]);

  const activeRecruit = recruits.find((r) => r.is_active) ?? null;
  const hasPendingUpdate = (pendingUpdates.count ?? 0) > 0;
  const imageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{branch.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {branch.registration_status === 'pending'
            ? '신규 등록 후 관리자 승인 대기 중입니다.'
            : branch.registration_status === 'rejected'
              ? '등록이 반려되었습니다. 정보를 수정해 다시 제출해주세요.'
              : '공개 중인 지점입니다.'}
        </p>
      </div>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="pt-4 text-sm text-amber-900">
          이름/주소/지역/소개글/설계사수/편의시설/사진 수정은 관리자 승인 후에 반영됩니다. 연락처/취급보험사/채용정보는 저장 즉시 반영됩니다.
        </CardContent>
      </Card>

      <PartnerBranchEditForm
        branch={branch}
        regions={regions}
        insurers={insurers}
        selectedInsurerIds={selectedInsurerIds}
        contacts={contacts}
        activeRecruit={activeRecruit}
        media={media}
        imageBaseUrl={imageBaseUrl}
        hasPendingUpdate={hasPendingUpdate}
      />
    </div>
  );
}
