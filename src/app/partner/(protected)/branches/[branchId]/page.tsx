import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { requirePartner } from '@/lib/partner/session';
import { getManageableBranchIds } from '@/lib/partner/manageable';
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
import { BranchRejectionNotice } from '@/components/partner/BranchRejectionNotice';
import { Card, CardContent } from '@/components/ui/card';

export default async function PartnerBranchDetailPage({ params }: { params: { branchId: string } }) {
  const partner = await requirePartner();
  const branch = await getBranchById(params.branchId);
  if (!branch) notFound();

  // 🔴 화면 가드를 저장 가드와 같은 기준으로 맞춘다.
  //    예전에는 회사 단위(`ga_company_id` 비교)라 **열리는데 저장만 실패**하는 지점이 있었다.
  //    0115 미적용이면 null이 오므로 그때는 예전 기준으로 되돌아간다.
  const manageableIds = await getManageableBranchIds();
  const allowed = manageableIds
    ? manageableIds.has(branch.id)
    : branch.ga_company_id === partner.ga_company_id;
  if (!allowed) notFound();

  const supabase = createServerSupabaseClient();
  // 반려된 신규등록 건 - 사유(review_reason)를 재제출 "전에" 보여줘야 한다(0101).
  // RLS가 제출자 본인에게만 열어주므로 서비스롤 없이 그대로 조회한다.
  const rejectedRegistrationPromise = supabase
    .from('branch_registrations')
    .select('id, status, review_reason')
    .eq('branch_id', branch.id)
    .eq('request_type', 'create')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [company, regions, insurers, selectedInsurerIds, contacts, recruits, media, { data: openRegistrationRows }, { data: rejectedRegistration }] = await Promise.all([
    getGaCompanyById(branch.ga_company_id),
    listRegions(),
    listInsurers(),
    getBranchInsurerIds(branch.id),
    getBranchContacts(branch.id),
    getBranchRecruits(branch.id),
    getBranchMedia(branch.id),
    supabase.rpc('get_open_branch_update', { p_branch_id: branch.id }),
    rejectedRegistrationPromise,
  ]);

  const activeRecruit = recruits.find((r) => r.is_active) ?? null;
  const openRegistration = openRegistrationRows?.[0] ?? null;
  const imageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{branch.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {branch.registration_status === 'pending'
              ? '신규 등록 후 운영팀 승인 대기 중입니다.'
              : branch.registration_status === 'rejected'
                ? // 사유와 재제출 버튼은 아래 BranchRejectionNotice가 맡는다. 여기서 다시
                  // "수정해 다시 제출해주세요"라고 쓰면 같은 안내가 두 번 나오고, 정작
                  // 누를 버튼은 아래에 있어 사용자가 위에서 방법을 찾다 만다.
                  '등록이 반려되었습니다.'
                : '공개 중인 지점입니다.'}
          </p>
        </div>
        <Link
          href={`/partner/branches/${branch.id}/performance`}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
        >
          <BarChart3 className="h-3.5 w-3.5" /> 성과 보기
        </Link>
      </div>

      {branch.registration_status === 'rejected' && rejectedRegistration && (
        <BranchRejectionNotice
          registrationId={rejectedRegistration.id}
          branchId={branch.id}
          reason={rejectedRegistration.review_reason}
        />
      )}

      {branch.registration_status === 'pending' && (
        // 재제출 직후 사용자가 "눌렸나?"를 확인할 곳이 필요하다. 이 문구가 없으면
        // 반려 카드가 사라진 것만 보이고 무슨 일이 일어났는지 알 수 없다.
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="pt-4 text-sm text-blue-900">
            운영팀이 심사 중입니다. 심사 중에도 내용을 계속 수정할 수 있고, 운영팀은 항상 최신 내용을 검토합니다.
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="pt-4 text-sm text-amber-900">
          이름/주소/지역/소개글/설계사수/편의시설/사진 수정은 운영팀 승인 후에 반영됩니다. 승인 대기 중에도 언제든 다시 수정해 제출할 수 있으며, 운영팀은 항상 최신 내용만 검토합니다.
          연락처/취급보험사/채용정보는 저장 즉시 반영됩니다.
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
        openRegistration={
          openRegistration
            ? {
                status: openRegistration.status as 'draft' | 'pending',
                registrant: {
                  name: openRegistration.registrant_name,
                  title: openRegistration.registrant_title,
                  phone: openRegistration.registrant_phone,
                  company: openRegistration.registrant_company,
                  branchLabel: openRegistration.registrant_branch_label,
                },
                payload: openRegistration.payload as Record<string, unknown>,
              }
            : null
        }
      />
    </div>
  );
}
