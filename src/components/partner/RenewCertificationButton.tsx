'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { renewPlannerCertificationAction } from '@/lib/actions/planners';
import { Button } from '@/components/ui/button';

/** 만료 예정/만료 상태의 인증 옆에 노출되는 재인증 버튼 - 새 원천징수영수증만 다시 첨부하면
 * 되며, 실제 만료일 연장은 관리자 승인 시에만 이루어진다. */
export function RenewCertificationButton({ certificationId, branchId }: { certificationId: string; branchId: string }) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    startTransition(async () => {
      const result = await renewPlannerCertificationAction(certificationId, branchId, formData);
      if (result.success) {
        toast.success('재인증 신청이 접수되었습니다. 관리자 승인 후 인증기간이 연장됩니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files)} />
      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
        <RefreshCw className="h-3.5 w-3.5" />
        {isPending ? '제출 중...' : '재인증'}
      </Button>
    </>
  );
}
