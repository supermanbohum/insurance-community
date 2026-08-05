'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setVisitorAdjustmentAction } from '@/lib/actions/visitors-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/** 숫자만 입력하고 저장하면 즉시 반영된다(하루 1개 값으로 덮어쓰기). */
export function VisitorAdjustmentForm({ currentAdjustment }: { currentAdjustment: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(String(currentAdjustment));
  const [reason, setReason] = useState('');

  const parsed = Number(value);
  const canSubmit = value.trim() !== '' && Number.isInteger(parsed);

  function submit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await setVisitorAdjustmentAction(parsed, reason.trim());
      if (result.success) {
        toast.success('저장되었습니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예: 500"
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">명 (음수 입력 시 차감)</span>
      </div>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (선택)" rows={2} />
      <Button disabled={isPending || !canSubmit} onClick={submit} className="w-fit">
        저장
      </Button>
    </div>
  );
}
