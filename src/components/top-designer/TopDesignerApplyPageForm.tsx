'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { submitTopDesignerCertificationAction } from '@/lib/actions/top-designer';
import { TopDesignerApplyFields, EMPTY_TOP_DESIGNER_APPLY_STATE } from '@/components/top-designer/TopDesignerApplyFields';
import { Button } from '@/components/ui/button';

export function TopDesignerApplyPageForm({ plannerProfileId }: { plannerProfileId: string }) {
  const router = useRouter();
  const [state, setState] = useState({ ...EMPTY_TOP_DESIGNER_APPLY_STATE, enabled: true });
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.jobTitle.trim() || !state.file) {
      toast.error('직급과 원천징수영수증을 입력해주세요.');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('file', state.file!);
      const result = await submitTopDesignerCertificationAction(
        plannerProfileId,
        { jobTitle: state.jobTitle, declaredAnnualIncomeKrw: state.declaredIncome ? Number(state.declaredIncome) : undefined },
        fd
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('TOP 설계사 인증 신청이 접수되었습니다. 운영팀 승인 후 배지가 표시됩니다.');
      router.push('/planner-market/my');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TopDesignerApplyFields value={state} onChange={setState} showToggle={false} />
      <Button type="submit" disabled={isPending || !state.jobTitle.trim() || !state.file} size="lg">
        {isPending ? '제출 중...' : 'TOP 설계사 인증 신청'}
      </Button>
    </form>
  );
}
