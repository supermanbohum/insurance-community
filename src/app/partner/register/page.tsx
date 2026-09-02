import { requireFullMember } from '@/lib/auth/session';
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
  const user = await requireFullMember('/partner/register');

  const supabase = createServerSupabaseClient();
  await supabase.rpc('signup_ga_admin', { p_display_name: user.nickname });

  const partner = await requirePartner();
  // 🔴 예전에는 이미 지점이 있으면 여기서 되돌려보냈다 — **계정당 지점 하나**였기 때문이다.
  //    컴패니언처럼 사무실이 여러 곳인 GA는 두 번째부터 등록 자체를 못 했다(카톡 문의 2026-08-19).
  //    0119부터 같은 GA 안에서는 추가 등록이 된다. 다른 GA 이름이면 RPC가 GA_NAME_MISMATCH 로 막는다.
  //    이미 소속이 있으면 GA 선택을 자기 회사로 고정해서 애초에 어긋나지 않게 한다.
  const lockedGaCompanyId = partner.ga_company_id ?? null;

  const [regions, gaOptions, draft] = await Promise.all([listRegions(), listGaFilterOptions(), getMyBranchRegistrationDraftAction()]);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <PartnerStepIndicator status="onboarding" />
      <div>
        <h1 className="text-xl font-bold">지점 등록 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          입력한 정보는 보험맵 운영팀 검토 후 승인되면 공개됩니다.
        </p>
      </div>
      <OnboardingForm
        regions={regions}
        gaOptions={gaOptions}
        initialDraft={draft as RegistrationDraftPayload | null}
        signupContact={user.contact}
        signupGaCompanyId={lockedGaCompanyId ?? user.gaCompanyId}
        lockGaCompany={Boolean(lockedGaCompanyId)}
      />
    </div>
  );
}
