import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requirePartner } from '@/lib/partner/session';
import { listRegions } from '@/lib/admin/branch';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { getMyBranchRegistrationDraftAction } from '@/lib/actions/partner';
import { OnboardingForm, type RegistrationDraftPayload } from '@/components/partner/OnboardingForm';
import { PartnerStepIndicator } from '@/components/partner/PartnerStepIndicator';
import { BackButton } from '@/components/shared/BackButton';

/**
 * 지점 등록 진입점 - 별도의 파트너 전용 회원가입/로그인을 다시 받지 않고, 홈페이지의
 * 일반 회원 로그인만 사용한다. 비로그인 상태로 들어오면 /login?next=/partner/register로
 * 보내 로그인 완료 후 바로 이 페이지로 돌아오게 한다.
 *
 * ga_admin_users 행은 signup_ga_admin RPC로 auth.uid() 기준 멱등 생성한다(이미 있으면
 * 그대로 반환) - 별도 이메일/비밀번호 계정을 새로 만들지 않고 지금 로그인된 세션에
 * 그대로 연결한다.
 */
export default async function PartnerRegisterPage() {
  const user = await getCurrentUser();
  if (!user?.isFullMember) {
    redirect('/login?next=/partner/register');
  }

  const supabase = createServerSupabaseClient();
  await supabase.rpc('signup_ga_admin', { p_display_name: user.nickname });

  const partner = await requirePartner();
  if (partner.ga_company_id) {
    redirect('/partner');
  }

  const [regions, gaOptions, draft] = await Promise.all([listRegions(), listGaFilterOptions(), getMyBranchRegistrationDraftAction()]);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <PartnerStepIndicator status="onboarding" />
      <div>
        <h1 className="text-xl font-bold">지점 등록 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          입력한 정보는 보험맵 관리자 검토 후 승인되면 공개됩니다.
        </p>
      </div>
      <OnboardingForm regions={regions} gaOptions={gaOptions} initialDraft={draft as RegistrationDraftPayload | null} />
    </div>
  );
}
