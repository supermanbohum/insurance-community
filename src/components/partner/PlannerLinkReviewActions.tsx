'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewPlannerLinkAction } from '@/lib/actions/branch-planner-review';
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
} from '@/components/ui/alert-dialog';

/**
 * 설계사 지점 연결 승인/보류/반려 - **지점 관리자**가 쓴다(오너 확정 2026-08-13).
 *
 * 🔴 승인은 확인 없이 바로 하지 않는다. 승인되면 그 사람이 우리 지점 소속으로
 * 공개되고, 홈에 「우리 지점 보기」가 뜬다 - 되돌리려면 다시 반려해야 한다.
 *
 * 🔴 보류·반려는 사유가 필수다. 사유 없이 막으면 신청자는 무엇을 고쳐야 하는지 모르고,
 * 그대로 방치되면 「승인이 안 난다」로만 남는다 - 이 화면이 없어서 5명이 겪은 일이다.
 */
export function PlannerLinkReviewActions({
  registrationId,
  plannerName,
  status,
}: {
  registrationId: string;
  plannerName: string;
  status: 'pending_review' | 'on_hold' | 'rejected' | 'approved';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<null | 'approve' | 'on_hold' | 'reject'>(null);
  const [reason, setReason] = useState('');

  function run(decision: 'approved' | 'on_hold' | 'rejected' | 'pending_review', withReason?: string) {
    startTransition(async () => {
      const result = await reviewPlannerLinkAction(registrationId, decision, withReason);
      if (result.success) {
        toast.success(
          decision === 'approved'
            ? `${plannerName}님을 우리 지점 소속으로 승인했습니다.`
            : decision === 'pending_review'
              ? '심사 대기로 되돌렸습니다.'
              : decision === 'on_hold'
                ? '보류로 처리했습니다.'
                : '반려했습니다.'
        );
        setDialog(null);
        setReason('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status !== 'approved' && (
          <Button size="sm" disabled={isPending} onClick={() => setDialog('approve')}>
            승인
          </Button>
        )}
        {status === 'pending_review' && (
          <>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setDialog('on_hold')}>
              보류
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setDialog('reject')}>
              반려
            </Button>
          </>
        )}
        {/* 보류 상태에서만 되돌리기를 준다 - 반려는 신청자가 다시 신청하는 흐름이다. */}
        {status === 'on_hold' && (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run('pending_review')}>
            심사 대기로 되돌리기
          </Button>
        )}
      </div>

      <AlertDialog open={dialog === 'approve'} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{plannerName}님을 우리 지점 소속으로 승인할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              승인하면 이 설계사가 우리 지점 소속으로 표시되고, 본인 홈에 우리 지점이 나타납니다.
              제출한 명함은 승인과 동시에 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={() => run('approved')}>
              승인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === 'on_hold' || dialog === 'reject'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === 'reject' ? '반려' : '보류'} 사유를 적어주세요</AlertDialogTitle>
            <AlertDialogDescription>
              {/* 🔴 사유가 신청자에게 그대로 간다는 것을 미리 알린다 - 모르고 쓰면 내부 메모처럼 쓴다. */}
              적으신 내용이 <b>{plannerName}님에게 그대로 전달</b>됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={dialog === 'reject' ? '예) 우리 지점 소속이 아닙니다.' : '예) 명함이 흐려 확인이 어렵습니다.'}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || !reason.trim()}
              onClick={() => run(dialog === 'reject' ? 'rejected' : 'on_hold', reason)}
            >
              {dialog === 'reject' ? '반려' : '보류'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
