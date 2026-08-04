import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listRegions, listInsurers } from '@/lib/admin/branch';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { PlannerMarketRegisterForm } from '@/components/planner-market/PlannerMarketRegisterForm';
import { BackButton } from '@/components/shared/BackButton';

function photoUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/planner-market-profile-photos/${path}`;
}

/** 설계사 정보 수정 - 소유자만. 저장 즉시 재심사 대기 상태로 돌아간다(RPC 참고). */
export default async function PlannerMarketEditPage() {
  const user = await getCurrentUser();
  if (!user?.isFullMember) {
    redirect('/login?next=/planner-market/edit');
  }

  const supabase = createServerSupabaseClient();
  const [{ data: profiles }, regions, insurers, gaOptions] = await Promise.all([
    supabase.rpc('get_my_planner_market_profile'),
    listRegions(),
    listInsurers(),
    listGaFilterOptions(),
  ]);
  const profile = profiles?.[0] ?? null;
  if (!profile) {
    redirect('/planner-market/register');
  }

  const { data: insurerRows } = await supabase.from('planner_profile_insurers').select('insurer_id').eq('planner_profile_id', profile.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <h1 className="text-xl font-bold">설계사 정보 수정</h1>
      <PlannerMarketRegisterForm
        regions={regions}
        insurers={insurers}
        gaOptions={gaOptions}
        initialProfile={{
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          kakaoId: profile.kakao_id,
          profilePhotoPath: profile.profile_photo_path,
          profilePhotoUrl: photoUrl(profile.profile_photo_path),
          activeRegionId: profile.active_region_id,
          careerYears: profile.career_years,
          specialties: profile.specialties,
          insurerIds: (insurerRows ?? []).map((r) => r.insurer_id),
          currentlyEmployed: profile.currently_employed,
          openToMove: profile.open_to_move,
          selfIntroduction: profile.self_introduction,
          desiredRegionId: profile.desired_region_id,
          desiredGaCompanyId: profile.desired_ga_company_id,
          desiredConditions: profile.desired_conditions,
        }}
      />
    </div>
  );
}
