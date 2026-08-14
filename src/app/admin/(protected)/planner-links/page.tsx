import { listAllPlannerLinksAction, adminReviewPlannerLinkAction } from '@/lib/actions/branch-planner-review-admin';
import { PlannerLinkReviewActions } from '@/components/partner/PlannerLinkReviewActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기',
  on_hold: '보류',
  rejected: '반려',
  approved: '승인됨',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  on_hold: 'warning',
  rejected: 'destructive',
  approved: 'success',
};

/**
 * 설계사 지점 연결 심사 - **운영팀 예비 경로**(오너 지시 2026-08-14).
 *
 * 🔴 주체는 지점 관리자다(오너 확정 2026-08-13, /partner/planner-links).
 * 이 화면은 지점장이 계정을 잃었거나 방치할 때 운영팀이 대신 처리하는 자리이지
 * 주체를 옮기는 것이 아니다 - 그래서 화면에도 그 사실을 그대로 적는다.
 *
 * RPC의 플랫폼 관리자 경로(0112, current_admin_id())는 처음부터 열려 있었고,
 * 막혀 있던 것은 목록 조회 경로와 이 화면뿐이었다. RPC는 손대지 않았다.
 */
export default async function AdminPlannerLinksPage() {
  const links = await listAllPlannerLinksAction();
  const pending = links.filter((l) => l.status === 'pending_review');
  const others = links.filter((l) => l.status !== 'pending_review');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설계사 연결 승인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          설계사가 지점 소속으로 등록을 신청한 건입니다. <b>원칙적으로 해당 지점 관리자가
          심사</b>하며, 이 화면은 지점 관리자가 처리하지 못할 때 운영팀이 대신 처리하는 예비
          경로입니다. 승인·보류·반려는 지점 관리자가 한 것과 동일하게 반영됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            심사 대기 {pending.length > 0 && <span className="text-brand-600">{pending.length}건</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">지금 심사를 기다리는 신청이 없습니다.</p>
          ) : (
            pending.map((link) => (
              <div key={link.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{link.name}</span>
                  <span className="text-xs text-ink-faint">{link.jobTitle}</span>
                  <Badge variant={STATUS_VARIANT[link.status]}>{STATUS_LABEL[link.status]}</Badge>
                </div>
                <p className="text-xs text-ink-faint">
                  {link.branchName} · 신청일 {new Date(link.createdAt).toLocaleDateString('ko-KR')}
                </p>
                <PlannerLinkReviewActions
                  registrationId={link.id}
                  plannerName={link.name}
                  status={link.status}
                  action={adminReviewPlannerLinkAction}
                  audience="admin"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">처리한 신청</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {others.map((link) => (
              <div key={link.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{link.name}</span>
                  <span className="text-xs text-ink-faint">{link.jobTitle}</span>
                  <Badge variant={STATUS_VARIANT[link.status]}>{STATUS_LABEL[link.status]}</Badge>
                </div>
                <p className="text-xs text-ink-faint">{link.branchName}</p>
                {link.reviewReason && (
                  <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-soft">
                    사유: {link.reviewReason}
                  </p>
                )}
                <PlannerLinkReviewActions
                  registrationId={link.id}
                  plannerName={link.name}
                  status={link.status}
                  action={adminReviewPlannerLinkAction}
                  audience="admin"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
