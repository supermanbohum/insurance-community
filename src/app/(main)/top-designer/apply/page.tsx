import { redirect } from 'next/navigation';
import { requireFullMember } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TopDesignerApplyPageForm } from '@/components/top-designer/TopDesignerApplyPageForm';
import { BackButton } from '@/components/shared/BackButton';

/** 이미 설계사마켓 프로필이 있는 회원을 위한 단독 TOP 설계사 신청 진입점 -
 * 프로필이 없으면 먼저 설계사 등록부터 하도록 안내한다(등록 폼 자체에도 동일한
 * 신청 토글이 있으므로, 굳이 여기서 프로필까지 새로 만들게 하지 않는다). */
export default async function TopDesignerApplyPage() {
  const user = await requireFullMember('/top-designer/apply');

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
        <h1 className="text-xl font-bold">TOP 설계사 인증 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          원천징수영수증으로 연봉을 증빙하면 관리자 검토 후 별등급(⭐1억~10억) 배지가 부여됩니다. 대표/본부장/지점장 등 관리직은
          신청할 수 없습니다.
        </p>
      </div>
      <TopDesignerApplyPageForm plannerProfileId={profile.id} />
    </div>
  );
}
