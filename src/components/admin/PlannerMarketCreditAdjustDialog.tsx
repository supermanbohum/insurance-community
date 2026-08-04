'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adjustPlannerMarketCreditsAction } from '@/lib/actions/planner-market-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/** 열람권 수동 지급/차감 - 양수를 입력하면 지급, 음수를 입력하면 차감된다.
 * 사유는 필수이며 planner_market_credit_adjustments에 감사로그로 남는다. */
export function PlannerMarketCreditAdjustDialog({ gaCompanyId, gaCompanyName }: { gaCompanyId: string; gaCompanyName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  const parsedDelta = Number(delta);
  const canSubmit = Number.isInteger(parsedDelta) && parsedDelta !== 0 && reason.trim().length > 0;

  function submit() {
    startTransition(async () => {
      const result = await adjustPlannerMarketCreditsAction(gaCompanyId, parsedDelta, reason.trim());
      if (result.success) {
        toast.success('처리되었습니다.');
        setOpen(false);
        setDelta('');
        setReason('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          수동 지급/차감
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gaCompanyName} 열람권 수동 조정</DialogTitle>
          <DialogDescription>양수를 입력하면 지급, 음수를 입력하면 차감됩니다. 사유는 필수이며 이력에 남습니다.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="예: 10 또는 -5" />
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유를 입력해주세요" rows={3} />
        </div>
        <DialogFooter>
          <Button disabled={isPending || !canSubmit} onClick={submit}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
