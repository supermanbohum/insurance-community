import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Eye, MessageSquare } from 'lucide-react';
import { requirePartner } from '@/lib/partner/session';
import { getMyBranchesPerformance } from '@/lib/partner/branch-performance';
import { BackButton } from '@/components/shared/BackButton';
import { Card, CardContent } from '@/components/ui/card';

/** W-040 - 문의 도착/조회 푸시가 착지하는 화면. 지점장이 "내 지점이 어떻게 되고
 * 있는지" 한눈에 보는 용도라 딥링크 목적지로 이 화면을 지정했다(개별 문의 상세가
 * 아니라 여기로 보내고, 여기서 목록으로 이어지게 한다). */
export default async function PartnerBranchPerformancePage({ params }: { params: { branchId: string } }) {
  const partner = await requirePartner();
  if (!partner.ga_company_id) notFound();

  const performances = await getMyBranchesPerformance(partner.ga_company_id);
  const branch = performances.find((p) => p.branchId === params.branchId);
  if (!branch) notFound();

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">{branch.branchName} 성과</h1>
        <p className="mt-1 text-sm text-muted-foreground">이번 주(월요일부터) 기준입니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> 이번 주 조회수
            </div>
            <p className="text-2xl font-extrabold text-ink">{branch.viewsThisWeek.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> 이번 주 문의
            </div>
            <p className="text-2xl font-extrabold text-ink">{branch.inquiriesThisWeek.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {branch.inquiriesUnread > 0 && (
        <Link
          href="/partner/inquiries"
          className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-semibold text-brand-700"
        >
          확인하지 않은 문의 {branch.inquiriesUnread}건
          <span aria-hidden>→</span>
        </Link>
      )}

      <p className="text-xs text-muted-foreground">누적 조회수 {branch.totalViews.toLocaleString()}회</p>
    </div>
  );
}
