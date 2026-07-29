'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RotateCw } from 'lucide-react';
import { adminRestoreSubscriptionAction } from '@/lib/actions/payments';
import { Button } from '@/components/ui/button';

export function RestoreSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRestore() {
    startTransition(async () => {
      const result = await adminRestoreSubscriptionAction(subscriptionId);
      if (result.success) {
        toast.success('복구되었습니다.');
        router.refresh();
      } else {
        toast.error(result.error ?? '복구하지 못했습니다.');
      }
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleRestore}>
      <RotateCw className="h-3.5 w-3.5" />
      {isPending ? '복구 중...' : '수동 복구'}
    </Button>
  );
}
