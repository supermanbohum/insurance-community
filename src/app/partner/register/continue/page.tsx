import { redirect } from 'next/navigation';
import { requirePartner } from '@/lib/partner/session';
import { getBranchMedia } from '@/lib/admin/branch';
import { getMyIncompleteBranchRegistrationAction } from '@/lib/actions/partner';
import { ContinueRegistrationForm } from '@/components/partner/ContinueRegistrationForm';
import { PartnerStepIndicator } from '@/components/partner/PartnerStepIndicator';
import { BackButton } from '@/components/shared/BackButton';

/**
 * W-087④ - 사진 없이 저장된(status='incomplete') 등록에 사진을 마저 올리는 화면.
 * OnboardingForm(신규 등록 마법사)과 달리 ga_company/ga_branch가 이미 만들어져 있으므로
 * (submit_branch_registration_incomplete가 이미 생성함) 텍스트 정보/서류 단계는
 * 다시 받지 않고 사진 단계로 바로 들어간다. 완료되면 complete_branch_registration()이
 * review_branch_registration과 동일한 기준으로 다시 확인한 뒤 승인 대기열('pending')로
 * 올린다.
 */
export default async function ContinueRegistrationPage() {
  await requirePartner();
  const registration = await getMyIncompleteBranchRegistrationAction();
  if (!registration) {
    redirect('/partner');
  }

  const media = await getBranchMedia(registration.branchId);
  const imageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <PartnerStepIndicator status="onboarding" />
      <div>
        <h1 className="text-xl font-bold">{registration.branchName} 등록 마무리</h1>
        <p className="mt-1 text-sm text-muted-foreground">사진만 올리면 운영팀 승인 요청을 보낼 수 있습니다.</p>
      </div>
      <ContinueRegistrationForm
        registrationId={registration.registrationId}
        branchId={registration.branchId}
        media={media}
        imageBaseUrl={imageBaseUrl}
      />
    </div>
  );
}
