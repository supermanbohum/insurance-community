import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PlannerMyProfileCard } from '@/components/planner-market/PlannerMyProfileCard';
import { PlannerCertificationUploadForm } from '@/components/planner-market/PlannerCertificationUploadForm';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/shared/BackButton';

/** 내가 등록한 설계사 정보 - 자가서비스(비공개/해지/철회) + 인증배지 신청 진입점. */
export default async function PlannerMarketMyPage() {
  const user = await getCurrentUser();
  if (!user?.isFullMember) {
    redirect('/login?next=/planner-market/my');
  }

  const supabase = createServerSupabaseClient();
  const { data: profiles } = await supabase.rpc('get_my_planner_market_profile');
  const profile = profiles?.[0] ?? null;

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <BackButton />
        <p className="text-sm text-muted-foreground">아직 등록된 설계사 정보가 없습니다.</p>
        <Button asChild>
          <Link href="/planner-market/register">설계사 등록하기</Link>
        </Button>
      </div>
    );
  }

  const { data: certification } = await supabase
    .from('planner_market_certifications')
    .select('status, tier')
    .eq('planner_profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const badgeTier = certification?.status === 'approved' ? certification.tier : null;
  const showCertForm = profile.status === 'approved' && certification?.status !== 'pending_review' && !badgeTier;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
      <BackButton />
      <h1 className="text-xl font-bold">내가 등록한 설계사 정보</h1>

      <PlannerMyProfileCard
        profile={{
          id: profile.id,
          name: profile.name,
          status: profile.status,
          isHidden: profile.is_hidden,
          contactSharingRevoked: profile.contact_sharing_revoked_at !== null,
          reviewReason: profile.review_reason,
          badgeTier,
        }}
      />

      {certification?.status === 'pending_review' && (
        <p className="rounded-2xl border border-line bg-amber-50 p-4 text-sm text-amber-700">✅ 인증 설계사 배지 심사 중입니다.</p>
      )}

      {showCertForm && <PlannerCertificationUploadForm plannerProfileId={profile.id} />}
    </div>
  );
}
