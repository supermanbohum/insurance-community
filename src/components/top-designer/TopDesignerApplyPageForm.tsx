'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { submitTopDesignerCertificationAction, uploadTopDesignerIncomeDocAction, uploadTopDesignerPhotoAction } from '@/lib/actions/top-designer';
import { TopDesignerApplyFields, EMPTY_TOP_DESIGNER_APPLY_STATE } from '@/components/top-designer/TopDesignerApplyFields';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { Button } from '@/components/ui/button';

export function TopDesignerApplyPageForm({ gaOptions }: { gaOptions: GaFilterOption[] }) {
  const router = useRouter();
  const [state, setState] = useState(EMPTY_TOP_DESIGNER_APPLY_STATE);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    state.name.trim() &&
    state.gaCompanyId &&
    state.jobTitle.trim() &&
    state.incomeDocFile &&
    state.consentPublicDisplay &&
    (!state.photoFile || state.photoPublic !== null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !state.gaCompanyId || !state.incomeDocFile) {
      toast.error('이름/소속 GA/직급/원천징수영수증/공개 동의를 모두 입력해주세요.');
      return;
    }

    startTransition(async () => {
      const docFd = new FormData();
      docFd.set('file', state.incomeDocFile!);
      const uploadedDoc = await uploadTopDesignerIncomeDocAction(docFd);
      if (!uploadedDoc.success) {
        toast.error(uploadedDoc.error);
        return;
      }

      let photoPath: string | null = null;
      if (state.photoFile) {
        const photoFd = new FormData();
        photoFd.set('file', state.photoFile);
        const uploadedPhoto = await uploadTopDesignerPhotoAction(photoFd);
        if (!uploadedPhoto.success) {
          toast.error(uploadedPhoto.error);
          return;
        }
        photoPath = uploadedPhoto.path;
      }

      const result = await submitTopDesignerCertificationAction({
        name: state.name,
        gaCompanyId: state.gaCompanyId!,
        branchName: state.branchName,
        jobTitle: state.jobTitle,
        careerYears: state.careerYears ? Number(state.careerYears) : undefined,
        selfIntroduction: state.selfIntroduction,
        declaredAnnualIncomeKrw: state.declaredIncome ? Number(state.declaredIncome) : undefined,
        incomeDocPath: uploadedDoc.path,
        photoPath,
        photoPublic: photoPath ? state.photoPublic : null,
        consentPublicDisplay: state.consentPublicDisplay,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('TOP 설계사 인증 신청이 접수되었습니다. 운영팀 승인 후 배지와 개인 상세 페이지가 열립니다.');
      router.push('/top-designer');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TopDesignerApplyFields value={state} onChange={setState} gaOptions={gaOptions} />
      <Button type="submit" disabled={isPending || !canSubmit} size="lg">
        {isPending ? '제출 중...' : 'TOP 설계사 인증 신청'}
      </Button>
    </form>
  );
}
