import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { countMyUnreadPlannerContactNotifications } from '@/lib/public/planner-notifications.supabase';
import { PlannerMyProfileCard } from '@/components/planner-market/PlannerMyProfileCard';
import { PlannerIncomeBadgeUploadForm } from '@/components/planner-market/PlannerIncomeBadgeUploadForm';
import { PlannerProfileStatsCard } from '@/components/planner-market/PlannerProfileStatsCard';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/shared/BackButton';
import type { PlannerBadgeSummary } from '@/types/database';

/** 내가 등록한 설계사 정보 - 자가서비스(비공개/해지/철회) + 배지 신청 진입점 + 조회수 통계. */
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

  const [{ data: badgeRows }, { data: allBadgeTypes }, { data: statsRows }, unreadNotificationCount] = await Promise.all([
    supabase.from('planner_badges').select('*').eq('planner_profile_id', profile.id),
    supabase.from('planner_badge_types').select('code, label, icon, description, requires_document, self_applicable, sort_order').order('sort_order'),
    supabase.rpc('get_my_planner_market_profile_stats'),
    countMyUnreadPlannerContactNotifications(),
  ]);

  const typeByCode = new Map((allBadgeTypes ?? []).map((t) => [t.code, t]));
  const badgeRowByCode = new Map((badgeRows ?? []).map((b) => [b.badge_type_code, b]));

  const approvedBadges: PlannerBadgeSummary[] = (badgeRows ?? [])
    .filter((b) => b.status === 'approved')
    .map((b) => typeByCode.get(b.badge_type_code))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({ code: t.code, label: t.label, icon: t.icon }));

  // 서류 첨부가 필요한 자가신청 배지(연봉인증/MDRT/COT/TOT 등) - 새 배지 종류가
  // planner_badge_types에 추가돼도 이 화면은 코드 변경 없이 그대로 대응한다.
  const selfApplicableDocBadges = (allBadgeTypes ?? []).filter((t) => t.requires_document && t.self_applicable);
  const pendingDocBadges = selfApplicableDocBadges.filter((t) => badgeRowByCode.get(t.code)?.status === 'pending_review');
  const applicableDocBadges =
    profile.status === 'approved'
      ? selfApplicableDocBadges.filter((t) => {
          const status = badgeRowByCode.get(t.code)?.status;
          return status !== 'pending_review' && status !== 'approved';
        })
      : [];
  const stats = statsRows?.[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
      <BackButton />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내가 등록한 설계사 정보</h1>
        <Link href="/planner-market/notifications" className="relative flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-sunken">
          <Bell className="h-3.5 w-3.5" />
          열람 알림
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" aria-label={`읽지 않은 알림 ${unreadNotificationCount}건`} />
          )}
        </Link>
      </div>

      {profile.trust_update_status === 'pending' && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          활동지역/경력/희망GA 변경 요청이 관리자 승인 대기 중입니다.
        </p>
      )}

      {stats && (
        <PlannerProfileStatsCard
          stats={{ totalViews: stats.total_views, viewsLast7Days: stats.views_last_7_days, contactUnlockCount: stats.contact_unlock_count }}
        />
      )}

      <PlannerMyProfileCard
        profile={{
          id: profile.id,
          name: profile.name,
          status: profile.status,
          isHidden: profile.is_hidden,
          contactSharingRevoked: profile.contact_sharing_revoked_at !== null,
          reviewReason: profile.review_reason,
          badges: approvedBadges,
        }}
      />

      {pendingDocBadges.map((t) => (
        <p key={t.code} className="rounded-2xl border border-line bg-amber-50 p-4 text-sm text-amber-700">
          {t.icon} {t.label} 배지 심사 중입니다.
        </p>
      ))}

      {applicableDocBadges.map((t) => (
        <PlannerIncomeBadgeUploadForm
          key={t.code}
          plannerProfileId={profile.id}
          badgeTypeCode={t.code}
          icon={t.icon}
          label={t.label}
          description={t.description ?? ''}
        />
      ))}
    </div>
  );
}
