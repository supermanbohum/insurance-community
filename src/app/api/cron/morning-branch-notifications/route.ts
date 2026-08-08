import { NextResponse } from 'next/server';
import { getOvernightInquiryGroups } from '@/lib/push/overnight-inquiries';
import { getWeeklyBranchViewCounts } from '@/lib/push/weekly-branch-performance';
import { getActiveGaAdminAuthUserIdsByCompany } from '@/lib/push/ga-admins';
import { getStaleIncompleteRegistrations, markIncompleteReminderSent } from '@/lib/push/incomplete-registration-reminders';
import { sendExpoPushToUsers } from '@/lib/push/expo';

function isMondayKst(now = new Date()): boolean {
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstNow.getUTCDay() === 1;
}

/**
 * 매일 08:00 KST(23:00 UTC)에 실행되는 "아침 알림" 크론(W-040). 오너 지시(2026-08-08)로
 * 두 가지를 한 인프라에서 처리한다 - Vercel Cron이 CRON_SECRET을 Authorization
 * 헤더로 실어 호출한다(vercel.json 참고, advance-subscriptions와 동일 패턴).
 *
 * ① 매일: 조용한 시간대(21시~08시 KST)에 즉시발송을 건너뛴 문의들을 지점별로
 *    묶어 "어젯밤 문의 N건" 한 번에 발송(건별 발송 금지 - 오너 지시).
 * ② 월요일만: 지난주 조회수 브리핑("이번 주 {지점명}을 N명이 봤어요").
 *    APP_GROWTH_PLAN §4.5의 "브리핑성 알림은 주 1~2회 상한"에 따라 주 1회로 고정.
 * ③ 매일: 사진 없이 저장된(status='incomplete') 등록이 3일 이상 방치되면 1회만
 *    리마인드(W-087④) - incomplete_reminder_sent_at으로 매일 재발송을 막는다.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const overnightGroups = await getOvernightInquiryGroups();
  const weeklyViews = isMondayKst() ? await getWeeklyBranchViewCounts() : [];

  const companyIds = [...new Set([...overnightGroups.map((g) => g.gaCompanyId), ...weeklyViews.map((b) => b.gaCompanyId)])];
  const adminsByCompany = await getActiveGaAdminAuthUserIdsByCompany(companyIds);

  let overnightNotified = 0;
  for (const group of overnightGroups) {
    const authUserIds = adminsByCompany.get(group.gaCompanyId);
    if (!authUserIds || authUserIds.length === 0) continue;
    await sendExpoPushToUsers(authUserIds, {
      title: `${group.branchName}에 어젯밤 문의 ${group.count}건이 도착했어요`,
      body: '눌러서 확인해보세요.',
      data: { path: `/partner/branches/${group.branchId}/performance` },
    });
    overnightNotified += 1;
  }

  let weeklyNotified = 0;
  for (const branch of weeklyViews) {
    const authUserIds = adminsByCompany.get(branch.gaCompanyId);
    if (!authUserIds || authUserIds.length === 0) continue;
    await sendExpoPushToUsers(authUserIds, {
      title: `이번 주 ${branch.branchName}을(를) ${branch.viewCount}명이 봤어요`,
      body: '지금 지점 성과를 확인해보세요.',
      data: { path: `/partner/branches/${branch.branchId}/performance` },
    });
    weeklyNotified += 1;
  }

  // 0076 마이그레이션(incomplete_reminder_sent_at) 적용 전에 이 코드가 먼저 배포될 수
  // 있다 - 실패해도 이미 작동 중인 ①②(overnight/weekly push)는 절대 막히면 안 되므로
  // 이 구간만 별도로 감싼다.
  let incompleteReminded = 0;
  try {
    const staleIncomplete = await getStaleIncompleteRegistrations();
    for (const reg of staleIncomplete) {
      await sendExpoPushToUsers([reg.authUserId], {
        title: `${reg.branchName} 등록을 마무리하세요`,
        body: '사진만 올리면 승인 요청을 보낼 수 있어요.',
        data: { path: '/partner/register/continue' },
      });
      await markIncompleteReminderSent(reg.registrationId);
      incompleteReminded += 1;
    }
  } catch (err) {
    console.error('[morning-branch-notifications] incomplete reminder step failed', err);
  }

  return NextResponse.json({ overnightNotified, weeklyNotified, incompleteReminded });
}
