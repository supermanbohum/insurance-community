'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { resubmitBranchRegistrationAction } from '@/lib/actions/partner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

/**
 * 반려 사유 + 재심사 요청(0101).
 *
 * 🔴 사유를 여기서 반드시 보여준 다음에 재제출 버튼을 눌리게 한다.
 * resubmit_branch_registration이 review_reason을 null로 지우기 때문에, 누르고 나면
 * 무엇을 고쳐야 했는지 확인할 방법이 영영 사라진다. 그래서 확인 대화상자에도 사유를
 * 한 번 더 넣고 "이 사유는 다시 제출하면 사라집니다"라고 명시한다.
 *
 * 🔴 "수정을 끝냈는지"는 검사하지 않는다. 무엇을 고쳐야 하는지는 운영팀이 사유로
 * 적어준 것이고, 승인 시점의 최신값 검증은 review_branch_registration이 한다(0100).
 * 여기서 또 검사하면 두 곳의 기준이 어긋난다.
 */
export function BranchRejectionNotice({
  registrationId,
  branchId,
  reason,
}: {
  registrationId: string;
  branchId: string;
  reason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleResubmit() {
    setError(null);
    startTransition(async () => {
      const result = await resubmitBranchRegistrationAction(registrationId, branchId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="border-red-300 bg-red-50">
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold text-red-900">등록이 반려되었습니다</p>
            {reason ? (
              <p className="whitespace-pre-wrap text-sm text-red-900">{reason}</p>
            ) : (
              // 사유가 비어 있어도 화면이 침묵하면 안 된다 - 사용자는 무엇을 해야 할지 모른다.
              <p className="text-sm text-red-900">
                반려 사유가 기재되지 않았습니다. 운영팀에 문의하시면 사유를 확인해 드립니다.
              </p>
            )}
            <p className="text-[13px] text-red-800">
              아래 내용을 수정한 뒤 다시 제출하시면 운영팀이 재심사합니다.
            </p>
          </div>
        </div>

        {error && <p className="text-[13px] font-semibold text-red-700">{error}</p>}

        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={pending}>
                {pending ? '제출 중…' : '수정 완료 — 재심사 요청'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>재심사를 요청할까요?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="flex flex-col gap-2 text-left">
                    <span>지금 저장된 내용으로 다시 심사를 받습니다.</span>
                    {reason && (
                      <span className="rounded-lg bg-surface-sunken px-3 py-2 text-[13px] text-ink-soft">
                        반려 사유: {reason}
                      </span>
                    )}
                    <span className="font-semibold text-ink">
                      이 사유는 다시 제출하면 화면에서 사라집니다. 필요하면 지금 적어 두십시오.
                    </span>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleResubmit}>재심사 요청</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
