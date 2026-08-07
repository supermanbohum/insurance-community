import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWeeklyBranchViewCounts } from '@/lib/push/weekly-branch-performance';
import { sendExpoPushToUsers } from '@/lib/push/expo';

/**
 * 주간 조회수 요약 푸시(W-040 phase 3) - "이번 주 {지점명}을 N명이 봤습니다".
 * 월요일 09:00 KST에 Vercel Cron이 CRON_SECRET을 Authorization 헤더로 실어 호출한다
 * (vercel.json 참고, advance-subscriptions 크론과 동일 인증 패턴).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const branchViews = await getWeeklyBranchViewCounts();
  if (branchViews.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  const admin = createAdminClient();
  const companyIds = [...new Set(branchViews.map((b) => b.gaCompanyId))];
  const { data: admins } = await admin
    .from('ga_admin_users')
    .select('auth_user_id, ga_company_id')
    .in('ga_company_id', companyIds)
    .eq('is_active', true);

  const adminsByCompany = new Map<string, string[]>();
  for (const a of admins ?? []) {
    const list = adminsByCompany.get(a.ga_company_id) ?? [];
    list.push(a.auth_user_id);
    adminsByCompany.set(a.ga_company_id, list);
  }

  let notified = 0;
  for (const branch of branchViews) {
    const authUserIds = adminsByCompany.get(branch.gaCompanyId);
    if (!authUserIds || authUserIds.length === 0) continue;

    await sendExpoPushToUsers(authUserIds, {
      title: `이번 주 ${branch.branchName}을(를) ${branch.viewCount}명이 봤어요`,
      body: '지금 지점 성과를 확인해보세요.',
      data: { path: `/partner/branches/${branch.branchId}/performance` },
    });
    notified += 1;
  }

  return NextResponse.json({ notified });
}
