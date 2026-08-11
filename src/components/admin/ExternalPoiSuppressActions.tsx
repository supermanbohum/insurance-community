'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { suppressExternalPoiAction, unsuppressExternalPoiAction } from '@/lib/actions/map-external-pois-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** 표시 중단 - 사유는 선택 입력이다(오너 정책: 사유를 묻지 않는다). 그래서 사유가
 * 비어 있어도 버튼이 비활성화되지 않는다. */
export function SuppressPoiButton({ source, externalId, name }: { source: string; externalId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await suppressExternalPoiAction(source, externalId, reason);
      if (result.success) {
        toast.success('지도에서 내렸습니다. 다음 수집에도 다시 올라오지 않습니다.');
        setOpen(false);
        setReason('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={isPending}>
        표시 중단
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}을(를) 지도에서 내릴까요?</DialogTitle>
            <DialogDescription>
              지금 바로 사라지고, 이후 수집에서도 다시 올라오지 않습니다. 사유는 적지 않으셔도 됩니다.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (선택)" />
          <DialogFooter>
            <Button onClick={run} disabled={isPending}>
              {isPending ? '처리 중...' : '표시 중단'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UnsuppressPoiButton({ source, externalId }: { source: string; externalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await unsuppressExternalPoiAction(source, externalId);
      if (result.success) {
        toast.success('해제했습니다. 다음 수집부터 다시 대상이 됩니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={run} disabled={isPending}>
      해제
    </Button>
  );
}
