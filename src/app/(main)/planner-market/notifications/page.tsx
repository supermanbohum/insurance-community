import Link from 'next/link';
import { Eye, Building2 } from 'lucide-react';
import { requireFullMember } from '@/lib/auth/session';
import { listMyPlannerContactNotifications } from '@/lib/public/planner-notifications.supabase';
import { markPlannerContactNotificationsReadAction } from '@/lib/actions/planner-market';
import { BackButton } from '@/components/shared/BackButton';
import { formatMessengerTime } from '@/lib/utils';

/** 설계사 열람 알림 - GA가 연락처를 최초 열람할 때마다 쌓인다(item 18). 지점 소속
 * 열람이면 지점명 노출 + 클릭 시 지점 상세로, 아니면 "리쿠르터"로만 익명 표시된다. */
export default async function PlannerMarketNotificationsPage() {
  await requireFullMember('/planner-market/notifications');

  const notifications = await listMyPlannerContactNotifications();
  await markPlannerContactNotificationsReadAction();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <BackButton />
      <h1 className="text-xl font-bold">열람 알림</h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-16 text-center text-ink-faint">
          <Eye className="h-8 w-8" strokeWidth={1.5} />
          <p className="text-sm">아직 프로필을 열람한 리쿠르터가 없습니다.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id} className="rounded-2xl border border-line bg-white p-4">
              {n.branchId ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-ink">
                    <span className="mr-1.5">🏢</span>
                    <span className="font-semibold">{n.branchName}</span>에서 설계사님의 프로필을 열람했습니다.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-faint">{formatMessengerTime(n.createdAt)}</span>
                    <Link
                      href={`/branch/${n.branchSlug}`}
                      className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100"
                    >
                      <Building2 className="h-3 w-3" />
                      지점 보러가기
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-ink">
                    <span className="mr-1.5">👀</span>
                    리쿠르터가 설계사님의 프로필을 열람했습니다.
                  </p>
                  <span className="text-xs text-ink-faint">{formatMessengerTime(n.createdAt)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
