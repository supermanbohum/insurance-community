'use client';

import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export interface TopDesignerApplyState {
  enabled: boolean;
  jobTitle: string;
  declaredIncome: string;
  file: File | null;
}

export const EMPTY_TOP_DESIGNER_APPLY_STATE: TopDesignerApplyState = {
  enabled: false,
  jobTitle: '',
  declaredIncome: '',
  file: null,
};

/** TOP 설계사 인증 신청 공용 입력 - PlannerMarketRegisterForm(등록/수정 겸용)과
 * 독립 신청 페이지(/top-designer/apply)에서 동일하게 재사용한다. 관리직(대표/본부장/
 * 지점장 등)은 서버(is_blocked_designer_job_title)에서 최종 차단되므로, 여기서는
 * 안내 문구로만 미리 알려준다. */
export function TopDesignerApplyFields({
  value,
  onChange,
  showToggle = true,
}: {
  value: TopDesignerApplyState;
  onChange: (next: TopDesignerApplyState) => void;
  showToggle?: boolean;
}) {
  function pickFile(files: FileList | null) {
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
    onChange({ ...value, file: picked });
  }

  return (
    <div className="flex flex-col gap-3">
      {showToggle && (
        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <Label htmlFor="td-enabled" className="cursor-pointer font-normal">
            TOP 설계사 인증도 함께 신청
          </Label>
          <Switch id="td-enabled" checked={value.enabled} onCheckedChange={(enabled) => onChange({ ...value, enabled })} />
        </div>
      )}

      {(value.enabled || !showToggle) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-sunken p-4">
          <p className="text-xs text-muted-foreground">
            원천징수영수증으로 연봉을 증빙한 설계사에게 별등급(⭐1억~10억)을 부여합니다. 대표/본부장/지점장/단장/센터장 등 관리직은
            신청할 수 없습니다.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-job-title">직급</Label>
            <Input
              id="td-job-title"
              value={value.jobTitle}
              onChange={(e) => onChange({ ...value, jobTitle: e.target.value })}
              placeholder="예: 설계사"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-income">신고 연봉(원, 선택)</Label>
            <Input
              id="td-income"
              type="number"
              value={value.declaredIncome}
              onChange={(e) => onChange({ ...value, declaredIncome: e.target.value })}
              placeholder="예: 300000000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>원천징수영수증</Label>
            {value.file ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 truncate text-ink-soft">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{value.file.name}</span>
                </span>
                <button type="button" onClick={() => onChange({ ...value, file: null })} aria-label="파일 삭제">
                  <X className="h-4 w-4 text-ink-faint" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
                <FileText className="h-4 w-4" />
                파일 선택 (jpg/png/pdf)
                <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickFile(e.target.files)} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
