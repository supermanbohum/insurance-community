'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { setGaApprovalStatusAction } from '@/lib/actions/ga-admin';
import type { GaApprovalStatus } from '@/types/database';
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

/** GA 승인 상태 전이 버튼. 대시보드/목록/상세 어디서나 동일하게 동작한다. */
export function GaApprovalActions({
  gaCompanyId,
  gaName,
  status,
  size = 'sm',
}: {
  gaCompanyId: string;
  gaName: string;
  status: GaApprovalStatus;
  size?: 'sm' | 'default';
}) {
  const [isPending, startTransition] = useTransition();
  const [reasonDialog, setReasonDialog] = useState<'rejected' | 'suspended' | null>(null);
  const [reason, setReason] = useState('');

  function run(next: GaApprovalStatus, reasonText?: string) {
    startTransition(async () => {
      const result = await setGaApprovalStatusAction(gaCompanyId, next, reasonText);
      if (result.success) {
        toast.success(`${gaName} 상태가 변경되었습니다.`);
        setReasonDialog(null);
        setReason('');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === 'pending' && (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size={size} disabled={isPending}>
                승인
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{gaName}을(를) 승인할까요?</AlertDialogTitle>
                <AlertDialogDescription>승인 즉시 해당 GA의 모든 지점이 공개 노출됩니다.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => run('approved')}>승인</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size={size} variant="outline" disabled={isPending} onClick={() => setReasonDialog('rejected')}>
            반려
          </Button>
        </>
      )}

      {status === 'approved' && (
        <Button size={size} variant="outline" disabled={isPending} onClick={() => setReasonDialog('suspended')}>
          중지
        </Button>
      )}

      {status === 'suspended' && (
        <Button size={size} disabled={isPending} onClick={() => run('approved')}>
          재승인
        </Button>
      )}

      {status === 'rejected' && (
        <Button size={size} variant="outline" disabled={isPending} onClick={() => run('pending')}>
          재심사로 되돌리기
        </Button>
      )}

      <Dialog open={reasonDialog !== null} onOpenChange={(open) => !open && setReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialog === 'rejected' ? '반려 사유' : '중지 사유'}</DialogTitle>
            <DialogDescription>{gaName}에 표시되지는 않지만 감사 로그에 기록됩니다.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유를 입력해주세요"
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isPending || !reason.trim()}
              onClick={() => reasonDialog && run(reasonDialog, reason.trim())}
            >
              {reasonDialog === 'rejected' ? '반려' : '중지'} 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
