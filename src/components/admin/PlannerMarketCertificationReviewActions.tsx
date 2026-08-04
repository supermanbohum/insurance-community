'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewPlannerMarketCertificationAction } from '@/lib/actions/planner-market-admin';
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

export function PlannerMarketCertificationReviewActions({ certificationId, plannerName }: { certificationId: string; plannerName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reason, setReason] = useState('');

  function run(decision: 'approved' | 'rejected', reasonText?: string) {
    startTransition(async () => {
      const result = await reviewPlannerMarketCertificationAction(certificationId, decision, reasonText);
      if (result.success) {
        toast.success('처리되었습니다.');
        setReasonDialogOpen(false);
        setReason('');
        router.push('/admin/planner-market/certifications');
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
            <AlertDialogTitle>{plannerName}님의 인증 설계사 배지를 승인할까요?</AlertDialogTitle>
            <AlertDialogDescription>승인 시 즉시 &quot;설계사 찾기&quot;에 인증 배지가 표시됩니다.</AlertDialogDescription>
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
            <DialogDescription>신청 이력에 기록됩니다.</DialogDescription>
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
