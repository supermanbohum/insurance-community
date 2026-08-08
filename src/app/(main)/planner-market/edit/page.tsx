import { redirect } from 'next/navigation';
import { requireFullMember } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listRegions } from '@/lib/admin/branch';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { PlannerMarketRegisterForm } from '@/components/planner-market/PlannerMarketRegisterForm';
import { BackButton } from '@/components/shared/BackButton';

function photoUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/planner-market-profile-photos/${path}`;
}

/** 설계사 정보 수정 - 소유자만. 저장 즉시 재심사 대기 상태로 돌아간다(RPC 참고). */
export default async function PlannerMarketEditPage() {
  const user = await requireFullMember('/planner-market/edit');

  const supabase = createServerSupabaseClient();
  const [{ data: profiles }, regions, gaOptions] = await Promise.all([
    supabase.rpc('get_my_planner_market_profile'),
    listRegions(),
    listGaFilterOptions(),
  ]);
  const profile = profiles?.[0] ?? null;
  if (!profile) {
    redirect('/planner-market/register');
  }
  // 활동지역/경력/희망GA는 재승인 대기(draft/pending) 중이면 그 작성 내용을 그대로
  // 불러온다("이어서 작성") - 라이브 값은 운영팀 승인 전까지 그대로 유지된다.
  const hasOpenTrustUpdate = profile.trust_update_status !== 'none';

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <h1 className="text-xl font-bold">설계사 정보 수정</h1>
      <PlannerMarketRegisterForm
        regions={regions}
        gaOptions={gaOptions}
        initialProfile={{
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          kakaoId: profile.kakao_id,
          profilePhotoPath: profile.profile_photo_path,
          profilePhotoUrl: photoUrl(profile.profile_photo_path),
          activeRegionId: hasOpenTrustUpdate ? (profile.pending_active_region_id ?? profile.active_region_id) : profile.active_region_id,
          careerYears: hasOpenTrustUpdate ? (profile.pending_career_years ?? profile.career_years) : profile.career_years,
          specialties: profile.specialties,
          currentlyEmployed: profile.currently_employed,
          jobSearchStatus: profile.job_search_status,
          desiredStartTiming: profile.desired_start_timing,
          contactableTimes: profile.contactable_times ?? [],
          selfIntroduction: profile.self_introduction,
          desiredRegionId: profile.desired_region_id,
          desiredGaCompanyId: hasOpenTrustUpdate ? profile.pending_desired_ga_company_id : profile.desired_ga_company_id,
          desiredConditions: profile.desired_conditions,
        }}
      />
    </div>
  );
}
