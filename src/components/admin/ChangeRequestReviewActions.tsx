'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewChangeRequestAction, forceApproveChangeRequestAction } from '@/lib/actions/change-requests-admin';
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

export function ChangeRequestReviewActions({
  requestId,
  targetName,
  requestType,
}: {
  requestId: string;
  targetName: string;
  /** 🔴 서류 검사는 신규 등록(create)에만 걸린다. 수정 요청엔 강제 승인 버튼을 띄우지 않는다. */
  requestType: 'create' | 'update';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reason, setReason] = useState('');

  function runForce() {
    startTransition(async () => {
      const result = await forceApproveChangeRequestAction(requestId);
      if (result.success) {
        toast.success('필수 항목 없이 승인했습니다.');
        router.push('/admin/change-requests');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function run(decision: 'approved' | 'rejected', reasonText?: string) {
    startTransition(async () => {
      const result = await reviewChangeRequestAction(requestId, decision, reasonText);
      if (result.success) {
        toast.success('처리되었습니다.');
        setReasonDialogOpen(false);
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
            <AlertDialogDescription>승인 즉시 변경 내용이 실제 데이터에 반영됩니다(신규 등록은 지점이 공개됩니다).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => run('approved')}>승인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {requestType === 'create' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary" disabled={isPending}>
              서류 없이 승인
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{targetName}을 필수 항목 없이 승인할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                명함 · 대표사진 · 사무실사진 5장 · 소개글 50자 검사를 건너뜁니다. 승인 즉시 지점이 공개됩니다.
                <br />
                사진이 없으면 목록·지도 카드의 썸네일이 빈 칸으로 나옵니다.
                <br />
                강제 승인이었다는 기록과 무엇이 비어 있었는지가 이력에 남습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={runForce}>서류 없이 승인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Button variant="outline" disabled={isPending} onClick={() => setReasonDialogOpen(true)}>
        반려
      </Button>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
            <DialogDescription>파트너가 확인할 수 있도록 이력에 기록됩니다.</DialogDescription>
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
