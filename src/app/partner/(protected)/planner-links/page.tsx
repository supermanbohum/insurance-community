import { listPendingPlannerLinksAction } from '@/lib/actions/branch-planner-review';
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
 * 「우리 지점 설계사」 연결 승인 화면 - **지점 관리자**가 처리한다(오너 확정 2026-08-13).
 *
 * 🔴 이 화면이 없어서 신청이 무기한 쌓였다. [실측 2026-08-13] pending_review 5건이
 * 대기 중이었고, RPC는 있는데 **호출부가 0건**이라 아무도 승인할 수 없었다.
 * 신청자에게는 「승인이 안 난다」로만 보였다.
 *
 * ⚠️ 운영팀이 아니라 지점장이 주체다. 지점장이 자기 지점 소속 설계사를 가장 잘 알고,
 * 운영팀은 그 관계를 확인할 방법이 없다.
 */
export default async function PartnerPlannerLinksPage() {
  const links = await listPendingPlannerLinksAction();
  const pending = links.filter((l) => l.status === 'pending_review');
  const others = links.filter((l) => l.status !== 'pending_review');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">설계사 연결 승인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          우리 지점 소속으로 등록을 신청한 설계사입니다. 승인하면 그 설계사가 우리 지점 소속으로
          표시됩니다.
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
            // 🔴 0건은 「기능이 없다」가 아니라 「지금 처리할 것이 없다」다. 그 구분을 문장으로 준다.
            <p className="text-sm text-muted-foreground">지금 승인을 기다리는 신청이 없습니다.</p>
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
                {link.reviewReason && (
                  <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-soft">
                    사유: {link.reviewReason}
                  </p>
                )}
                <PlannerLinkReviewActions
                  registrationId={link.id}
                  plannerName={link.name}
                  status={link.status}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
