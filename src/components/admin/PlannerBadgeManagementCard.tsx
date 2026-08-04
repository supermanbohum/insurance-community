'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { grantPlannerBadgeAction, revokePlannerBadgeAction } from '@/lib/actions/planner-market-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlannerBadgeTypeItem } from '@/lib/admin/planner-badges';
import type { PlannerBadgeStatus } from '@/types/database';

const STATUS_VARIANT: Record<PlannerBadgeStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<PlannerBadgeStatus, string> = {
  pending_review: '심사 대기',
  approved: '부여됨',
  rejected: '반려/회수됨',
};

export interface PlannerBadgeRow {
  id: string;
  code: string;
  label: string;
  icon: string;
  status: PlannerBadgeStatus;
}

/** 배지 관리 - 현재 보유 배지 목록 + 관리자 수동 부여/회수. 새 배지 종류가 추가돼도
 * badgeTypes 카탈로그에서 자동으로 선택 목록에 나타난다(코드 변경 불필요). */
export function PlannerBadgeManagementCard({
  plannerProfileId,
  badges,
  badgeTypes,
}: {
  plannerProfileId: string;
  badges: PlannerBadgeRow[];
  badgeTypes: PlannerBadgeTypeItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCode, setSelectedCode] = useState<string>('');

  const grantableTypes = badgeTypes.filter((t) => !badges.some((b) => b.code === t.code && b.status === 'approved'));

  function grant() {
    if (!selectedCode) return;
    startTransition(async () => {
      const result = await grantPlannerBadgeAction(plannerProfileId, selectedCode);
      if (result.success) {
        toast.success('배지가 부여되었습니다.');
        setSelectedCode('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function revoke(badgeId: string) {
    startTransition(async () => {
      const result = await revokePlannerBadgeAction(badgeId, plannerProfileId);
      if (result.success) {
        toast.success('배지가 회수되었습니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-semibold">배지 관리</p>

      {badges.length === 0 ? (
        <p className="text-sm text-muted-foreground">부여된 배지가 없습니다.</p>
      ) : (
        <div className="flex flex-col divide-y">
          {badges.map((badge) => (
            <div key={badge.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                <span>{badge.icon}</span>
                {badge.label}
                <Badge variant={STATUS_VARIANT[badge.status]}>{STATUS_LABEL[badge.status]}</Badge>
              </span>
              {badge.status !== 'rejected' && (
                <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => revoke(badge.id)}>
                  회수
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {grantableTypes.length > 0 && (
        <div className="flex items-center gap-2 border-t pt-3">
          <Select value={selectedCode} onValueChange={setSelectedCode}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="부여할 배지 선택" />
            </SelectTrigger>
            <SelectContent>
              {grantableTypes.map((t) => (
                <SelectItem key={t.code} value={t.code}>
                  {t.icon} {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" disabled={!selectedCode || isPending} onClick={grant}>
            수동 부여
          </Button>
        </div>
      )}
    </div>
  );
}
