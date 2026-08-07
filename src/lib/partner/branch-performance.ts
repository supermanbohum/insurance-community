import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { listMyBranchInquiries } from '@/lib/partner/branch-inquiries';

/** W-040 - 이 시점 이전의 조회·문의는 정식 오픈 전 개발/QA 트래픽이라 지점장에게 보여줄
 * 성과 지표·푸시 문구에서 제외한다. 그대로 두면 "이번 주 N명이 봤습니다"에 우리 팀의
 * 테스트 조회가 섞여 숫자가 부풀려진다(사실 통지 원칙 위반). record_branch_view()가
 * is_admin_view를 실제로 세팅하지 않아(항상 false) 그 컬럼만으로는 걸러지지 않는다. */
export const PERFORMANCE_TRACKING_START = new Date('2026-08-08T00:00:00+09:00');

/** 이번 주 월요일 00:00(KST)와 PERFORMANCE_TRACKING_START 중 더 늦은 시각 - 기준일 직후
 * 첫 몇 주는 "이번 주"가 실제로는 부분 주간이 된다(정직한 부분집계가 거짓 완전집계보다 낫다). */
function windowStart(now = new Date()): Date {
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kstNow.getUTCDay(); // 0=일 ... 1=월
  const diffToMonday = day === 0 ? 6 : day - 1;
  const mondayKst = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - diffToMonday, 0, 0, 0)
  );
  const mondayUtc = new Date(mondayKst.getTime() - 9 * 60 * 60 * 1000);
  return mondayUtc > PERFORMANCE_TRACKING_START ? mondayUtc : PERFORMANCE_TRACKING_START;
}

export interface BranchPerformance {
  branchId: string;
  branchName: string;
  viewsThisWeek: number;
  inquiriesThisWeek: number;
  inquiriesUnread: number;
  totalViews: number;
}

/** 내 GA사 소속 지점들의 이번 주 조회수/문의수 - 파트너 성과 화면 + 푸시 문구가 공유하는
 * 단일 집계 소스(숫자가 화면과 알림에서 어긋나면 신뢰가 깨진다). */
export async function getMyBranchesPerformance(gaCompanyId: string): Promise<BranchPerformance[]> {
  const [branches, inquiries] = await Promise.all([getBranchesByGaCompanyId(gaCompanyId), listMyBranchInquiries()]);
  if (branches.length === 0) return [];

  const since = windowStart().toISOString();
  const supabase = createServerSupabaseClient();
  const branchIds = branches.map((b) => b.id);

  // branch_views RLS(0007 정책 G)가 "내 지점"만 select 허용하므로 세션 클라이언트로 충분하다.
  const { data: viewRows } = await supabase
    .from('branch_views')
    .select('branch_id')
    .in('branch_id', branchIds)
    .gte('created_at', since);

  const viewCountByBranch = new Map<string, number>();
  for (const row of viewRows ?? []) {
    viewCountByBranch.set(row.branch_id, (viewCountByBranch.get(row.branch_id) ?? 0) + 1);
  }

  const inquiriesThisWeekByBranch = new Map<string, number>();
  const inquiriesUnreadByBranch = new Map<string, number>();
  for (const inquiry of inquiries) {
    if (!inquiry.readAt) {
      inquiriesUnreadByBranch.set(inquiry.branchId, (inquiriesUnreadByBranch.get(inquiry.branchId) ?? 0) + 1);
    }
    if (new Date(inquiry.createdAt) >= windowStart()) {
      inquiriesThisWeekByBranch.set(inquiry.branchId, (inquiriesThisWeekByBranch.get(inquiry.branchId) ?? 0) + 1);
    }
  }

  return branches.map((branch) => ({
    branchId: branch.id,
    branchName: branch.name,
    viewsThisWeek: viewCountByBranch.get(branch.id) ?? 0,
    inquiriesThisWeek: inquiriesThisWeekByBranch.get(branch.id) ?? 0,
    inquiriesUnread: inquiriesUnreadByBranch.get(branch.id) ?? 0,
    totalViews: (branch.organic_view_count ?? 0) + (branch.imported_view_count ?? 0) + (branch.correction_view_count ?? 0),
  }));
}
