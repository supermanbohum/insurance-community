'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';
import { submitPlannerBadgeApplicationAction } from '@/lib/actions/planner-market';
import { Button } from '@/components/ui/button';
import { normalizeImageFiles, HEIC_ACCEPT } from '@/lib/images/heic';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** 서류 첨부가 필요한 자가신청 배지(연봉인증/MDRT/COT/TOT 등) 공용 신청 폼 -
 * badgeTypeCode/label/description만 바뀌고 나머지 로직은 완전히 동일하다.
 * TOP설계사 인증 폼(PlannerCertificationForm)과 모양만 같고 완전히 별개 경로다. */
export function PlannerIncomeBadgeUploadForm({
  plannerProfileId,
  badgeTypeCode,
  icon,
  label,
  description,
}: {
  plannerProfileId: string;
  badgeTypeCode: string;
  icon: string;
  label: string;
  description: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    // 아이폰 HEIC → JPEG 변환(오너 지시 2026-08-18). 실패는 조용히 버리지 않는다.
    const { ok, failed } = await normalizeImageFiles([file]);
    if (failed.length > 0) {
      toast.error(`${failed[0].name}: ${failed[0].reason}`);
      return;
    }
    const picked = ok[0];
    if (!DOC_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp, pdf, 아이폰 사진(HEIC)만 업로드할 수 있습니다.');
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
      const result = await submitPlannerBadgeApplicationAction(plannerProfileId, badgeTypeCode, fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} 신청이 접수되었습니다. 운영팀 검토 후 배지가 표시됩니다.`);
      setFile(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      <div>
        <h2 className="text-sm font-bold">
          {icon} {label} 배지 신청
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
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
          <input type="file" accept={`${DOC_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pick(e.target.files)} />
        </label>
      )}

      <Button type="button" disabled={!file || isPending} onClick={submit}>
        {isPending ? '제출 중...' : '인증 신청'}
      </Button>
    </div>
  );
}
