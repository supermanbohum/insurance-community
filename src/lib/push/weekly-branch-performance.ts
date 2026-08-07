import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { PERFORMANCE_TRACKING_START } from '@/lib/partner/branch-performance';

/** 지난주 월요일 00:00(KST) ~ 이번 주 월요일 00:00(KST) - "완료된 한 주"만 집계한다
 * (Monday 아침에 도는 크론이 이번 주 진행 중 데이터를 요약하는 건 어색하다).
 * PERFORMANCE_TRACKING_START 이전으로는 절대 넘어가지 않는다(개발/QA 트래픽 배제,
 * branch-performance.ts와 동일 원칙). start >= end면(트래킹 시작일이 이번 주 안에
 * 있는 첫 주) 아직 완료된 주가 없다는 뜻 - 호출부가 빈 배열로 처리한다. */
function lastCompletedWeekWindow(now = new Date()): { start: Date; end: Date } {
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kstNow.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisMondayKst = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - diffToMonday));
  const lastMondayKst = new Date(thisMondayKst.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = new Date(thisMondayKst.getTime() - 9 * 60 * 60 * 1000);
  const start = new Date(lastMondayKst.getTime() - 9 * 60 * 60 * 1000);
  return { start: start > PERFORMANCE_TRACKING_START ? start : PERFORMANCE_TRACKING_START, end };
}

export interface WeeklyBranchView {
  branchId: string;
  branchName: string;
  gaCompanyId: string;
  viewCount: number;
}

/** 지난주 조회수가 1 이상인 승인된 지점만 반환한다 - "이번 주 0명이 봤습니다"는
 * 알릴 가치가 없다(사실 통지 원칙과 별개로, 열게 만드는 4요소 중 "숫자"가 무의미해진다). */
export async function getWeeklyBranchViewCounts(): Promise<WeeklyBranchView[]> {
  const { start, end } = lastCompletedWeekWindow();
  if (start >= end) return [];

  const admin = createAdminClient();
  const { data: branches } = await admin.from('ga_branch').select('id, name, ga_company_id').eq('registration_status', 'approved');
  if (!branches || branches.length === 0) return [];

  const { data: viewRows } = await admin
    .from('branch_views')
    .select('branch_id')
    .in(
      'branch_id',
      branches.map((b) => b.id)
    )
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  const countByBranch = new Map<string, number>();
  for (const row of viewRows ?? []) {
    countByBranch.set(row.branch_id, (countByBranch.get(row.branch_id) ?? 0) + 1);
  }

  return branches
    .map((b) => ({ branchId: b.id, branchName: b.name, gaCompanyId: b.ga_company_id, viewCount: countByBranch.get(b.id) ?? 0 }))
    .filter((b) => b.viewCount > 0);
}
