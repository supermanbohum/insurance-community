'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';
import { submitPlannerMarketCertificationAction } from '@/lib/actions/planner-market';
import { Button } from '@/components/ui/button';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** 인증 설계사 배지 신청 - 소득증빙 서류(원천징수영수증/소득금액증명원) 업로드.
 * TOP설계사 인증 폼(PlannerCertificationForm)과 모양만 같고 완전히 별개 경로다. */
export function PlannerCertificationUploadForm({ plannerProfileId }: { plannerProfileId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  function pick(files: FileList | null) {
    const picked = files?.[0];
    if (!picked) return;
    if (!DOC_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp, pdf 형식만 업로드할 수 있습니다.');
      return;
    }
    if (picked.size > 10 * 1024 * 1024) {
      toast.error('파일은 최대 10MB까지 업로드할 수 있습니다.');
      return;
    }
    setFile(picked);
  }

  function submit() {
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('file', file);
      const result = await submitPlannerMarketCertificationAction(plannerProfileId, fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('인증 신청이 접수되었습니다. 관리자 검토 후 배지가 표시됩니다.');
      setFile(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      <div>
        <h2 className="text-sm font-bold">✅ 인증 설계사 배지 신청</h2>
        <p className="mt-1 text-xs text-muted-foreground">원천징수영수증 또는 소득금액증명원을 제출하면 관리자 검토 후 인증 배지가 표시됩니다.</p>
      </div>

      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm">
          <span className="flex items-center gap-1.5 truncate text-ink-soft">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{file.name}</span>
          </span>
          <button type="button" onClick={() => setFile(null)} aria-label="파일 삭제">
            <X className="h-4 w-4 text-ink-faint" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
          <FileText className="h-4 w-4" />
          파일 선택 (jpg/png/pdf)
          <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pick(e.target.files)} />
        </label>
      )}

      <Button type="button" disabled={!file || isPending} onClick={submit}>
        {isPending ? '제출 중...' : '인증 신청'}
      </Button>
    </div>
  );
}
