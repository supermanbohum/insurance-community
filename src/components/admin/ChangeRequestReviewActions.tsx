'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewChangeRequestAction } from '@/lib/actions/change-requests-admin';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ChangeRequestReviewActions({ requestId, targetName }: { requestId: string; targetName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonDialog, setReasonDialog] = useState<'rejected' | 'changes_requested' | null>(null);
  const [reason, setReason] = useState('');

  function run(decision: 'approved' | 'rejected' | 'changes_requested', reasonText?: string) {
    startTransition(async () => {
      const result = await reviewChangeRequestAction(requestId, decision, reasonText);
      if (result.success) {
        toast.success('처리되었습니다.');
        setReasonDialog(null);
        setReason('');
        router.push('/admin/change-requests');
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
            <AlertDialogTitle>{targetName}의 변경을 승인할까요?</AlertDialogTitle>
            <AlertDialogDescription>승인 즉시 변경 내용이 실제 데이터에 반영됩니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => run('approved')}>승인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="outline" disabled={isPending} onClick={() => setReasonDialog('changes_requested')}>
        수정 요청
      </Button>
      <Button variant="outline" disabled={isPending} onClick={() => setReasonDialog('rejected')}>
        반려
      </Button>

      <Dialog open={reasonDialog !== null} onOpenChange={(open) => !open && setReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialog === 'rejected' ? '반려 사유' : '수정 요청 사유'}</DialogTitle>
            <DialogDescription>파트너가 확인할 수 있도록 이력에 기록됩니다.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유를 입력해주세요" rows={3} />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isPending || !reason.trim()}
              onClick={() => reasonDialog && run(reasonDialog, reason.trim())}
            >
              {reasonDialog === 'rejected' ? '반려' : '수정 요청'} 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
