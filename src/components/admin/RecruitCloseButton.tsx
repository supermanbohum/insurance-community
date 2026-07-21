'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { closeBranchRecruitAction } from '@/lib/actions/branch-admin';
import { Button } from '@/components/ui/button';

export function RecruitCloseButton({ recruitId, branchId }: { recruitId: string; branchId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      const result = await closeBranchRecruitAction(recruitId, branchId);
      if (result.success) toast.success('마감 처리했습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClose}>
      마감
    </Button>
  );
}
