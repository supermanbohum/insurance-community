'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { refundPlannerMarketCreditPurchaseAction } from '@/lib/actions/planner-market-admin';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/** 열람권 구매 환불 - 이미 소진된 만큼은 환불할 수 없다(서버에서 차단, 수동 차감으로 별도 처리). */
export function PlannerMarketCreditRefundButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  function submit() {
    startTransition(async () => {
      const result = await refundPlannerMarketCreditPurchaseAction(purchaseId, reason.trim());
      if (result.success) {
        toast.success('환불 처리되었습니다.');
        setOpen(false);
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
          환불
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>구매 환불</DialogTitle>
          <DialogDescription>사유를 입력해주세요. 이미 소진된 열람권이 있으면 환불할 수 없습니다.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유를 입력해주세요" rows={3} />
        <DialogFooter>
          <Button variant="destructive" disabled={isPending || !reason.trim()} onClick={submit}>
            환불 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
