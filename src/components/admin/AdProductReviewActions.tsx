'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewBranchAdProductAction } from '@/lib/actions/ad-products-admin';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AdProductReviewActions({ adProductId, branchName }: { adProductId: string; branchName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reason, setReason] = useState('');

  function run(decision: 'approved' | 'rejected', reasonText?: string) {
    startTransition(async () => {
      const result = await reviewBranchAdProductAction(adProductId, decision, reasonText);
      if (result.success) {
        toast.success('처리되었습니다.');
        setReasonDialogOpen(false);
        setReason('');
        router.push('/admin/ad-products');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isPending}>승인</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{branchName}의 광고 상품을 승인할까요?</AlertDialogTitle>
            <AlertDialogDescription>승인 시 즉시 지점 노출에 반영됩니다(15분 대기 없음).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => run('approved')}>승인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="outline" disabled={isPending} onClick={() => setReasonDialogOpen(true)}>
        반려
      </Button>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
            <DialogDescription>반려 시 결제도 함께 환불 처리됩니다.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유를 입력해주세요" rows={3} />
          <DialogFooter>
            <Button variant="destructive" disabled={isPending || !reason.trim()} onClick={() => run('rejected', reason.trim())}>
              반려 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
