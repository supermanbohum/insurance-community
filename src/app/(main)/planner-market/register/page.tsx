import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { listRegions } from '@/lib/admin/branch';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { PlannerMarketRegisterForm } from '@/components/planner-market/PlannerMarketRegisterForm';
import { BackButton } from '@/components/shared/BackButton';

/** 설계사 등록 - 보험맵 일반회원(이메일 인증 완료)만 가능. TOP설계사 공개신청(/top-register)과
 * 동일한 게이트 패턴이되, 완전히 별개 데이터/RPC로 저장된다. */
export default async function PlannerMarketRegisterPage() {
  const user = await getCurrentUser();
  if (!user?.isFullMember) {
    redirect('/login?next=/planner-market/register');
  }

  const [regions, gaOptions] = await Promise.all([listRegions(), listGaFilterOptions()]);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">설계사 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          무료로 프로필을 등록하면 GA가 나를 찾을 수 있습니다. 활동지역/경력/전문분야/자기소개는 공개되고, 연락처는 GA가 열람권을
          사용해야만 볼 수 있습니다. 관리자 승인 후 공개됩니다.
        </p>
      </div>
      <PlannerMarketRegisterForm regions={regions} gaOptions={gaOptions} />
    </div>
  );
}
