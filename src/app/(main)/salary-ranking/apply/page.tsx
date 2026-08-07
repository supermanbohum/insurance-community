import { redirect } from 'next/navigation';
import { requireFullMember } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SalaryRankingApplyForm } from '@/components/salary-ranking/SalaryRankingApplyForm';
import { BackButton } from '@/components/shared/BackButton';

/** 연봉 랭킹 신청 - TOP설계사와 마찬가지로 설계사마켓 프로필(planner_profiles)이
 * 있어야 하지만, "완전 별도 메뉴"라는 요구사항대로 등록 폼(PlannerMarketRegisterForm)에는
 * 연결하지 않고 이 독립 페이지로만 신청받는다. */
export default async function SalaryRankingApplyPage() {
  const user = await requireFullMember('/salary-ranking/apply');

  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('get_my_planner_market_profile');
  const profile = data?.[0];

  if (!profile) {
    redirect('/planner-market/register');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">전국 설계사 연봉 랭킹 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          원천징수영수증으로 연봉을 증빙하면 관리자 검토 후 랭킹 페이지에 공개됩니다. 대표/본부장/지점장 등 관리직은 등록할 수
          없습니다.
        </p>
      </div>
      <SalaryRankingApplyForm plannerProfileId={profile.id} />
    </div>
  );
}
