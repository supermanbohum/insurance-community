'use client';

import { toast } from 'sonner';
import { FileText, ImagePlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { GaSearchSelect } from '@/components/auth/GaSearchSelect';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { cn } from '@/lib/utils';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface TopDesignerApplyState {
  name: string;
  gaCompanyId: string | null;
  branchName: string;
  jobTitle: string;
  careerYears: string;
  selfIntroduction: string;
  declaredIncome: string;
  incomeDocFile: File | null;
  photoFile: File | null;
  photoPublic: boolean | null;
  consentPublicDisplay: boolean;
}

export const EMPTY_TOP_DESIGNER_APPLY_STATE: TopDesignerApplyState = {
  name: '',
  gaCompanyId: null,
  branchName: '',
  jobTitle: '',
  careerYears: '',
  selfIntroduction: '',
  declaredIncome: '',
  incomeDocFile: null,
  photoFile: null,
  photoPublic: null,
  consentPublicDisplay: false,
};

/** TOP 설계사 인증 신청 입력 - 설계사마켓과 완전 분리된 자체 필드다(오너 지시,
 * planner_profiles를 전혀 참조하지 않는다). 관리직(대표/본부장/지점장 등)은
 * 서버(is_blocked_designer_job_title)에서 최종 차단되므로, 여기서는 안내 문구로만
 * 미리 알려준다. */
export function TopDesignerApplyFields({
  value,
  onChange,
  gaOptions,
}: {
  value: TopDesignerApplyState;
  onChange: (next: TopDesignerApplyState) => void;
  gaOptions: GaFilterOption[];
}) {
  const hasPhoto = Boolean(value.photoFile);

  function pickDoc(files: FileList | null) {
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
    onChange({ ...value, incomeDocFile: picked });
  }

  function pickPhoto(files: FileList | null) {
    const picked = files?.[0];
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp 형식만 업로드할 수 있습니다.');
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      toast.error('이미지는 최대 5MB까지 업로드할 수 있습니다.');
      return;
    }
    onChange({ ...value, photoFile: picked, photoPublic: null });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        원천징수영수증으로 연봉을 증빙한 설계사에게 별등급(⭐1억~10억)을 부여합니다. 대표/본부장/지점장/단장/센터장 등 관리직은
        신청할 수 없습니다. 실명·GA·소속 지점은 TOP 설계사 페이지와 랭킹에 항상 공개됩니다.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="td-name">이름</Label>
        <Input id="td-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>소속 GA</Label>
        <GaSearchSelect options={gaOptions} value={value.gaCompanyId} onChange={(id) => onChange({ ...value, gaCompanyId: id })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="td-branch">본부/지점 (선택)</Label>
        <Input
          id="td-branch"
          value={value.branchName}
          onChange={(e) => onChange({ ...value, branchName: e.target.value })}
          placeholder="예: 강남본부, 서초지점"
        />
      </div>

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
        <Label htmlFor="td-career">경력 (년, 선택)</Label>
        <Input
          id="td-career"
          type="number"
          min={0}
          value={value.careerYears}
          onChange={(e) => onChange({ ...value, careerYears: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="td-intro">자기소개 (선택)</Label>
        <Textarea id="td-intro" value={value.selfIntroduction} onChange={(e) => onChange({ ...value, selfIntroduction: e.target.value })} rows={3} />
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
        {value.incomeDocFile ? (
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 truncate text-ink-soft">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{value.incomeDocFile.name}</span>
            </span>
            <button type="button" onClick={() => onChange({ ...value, incomeDocFile: null })} aria-label="파일 삭제">
              <X className="h-4 w-4 text-ink-faint" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-amber-300 hover:text-amber-600">
            <FileText className="h-4 w-4" />
            파일 선택 (jpg/png/pdf)
            <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickDoc(e.target.files)} />
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>프로필 사진 (선택)</Label>
        {value.photoFile ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-line bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(value.photoFile)} alt="프로필 사진" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange({ ...value, photoFile: null, photoPublic: null })}
              className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="사진 삭제"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-line text-center text-xs text-muted-foreground hover:border-amber-300 hover:text-amber-600">
            <ImagePlus className="h-5 w-5" />
            사진 선택
            <input type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => pickPhoto(e.target.files)} />
          </label>
        )}
        {hasPhoto && (
          <div className="mt-1 flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">비공개를 선택하면 열람권을 사용해도 볼 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...value, photoPublic: true })}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                  value.photoPublic === true ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-line text-ink-soft hover:border-amber-200'
                )}
              >
                공개
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...value, photoPublic: false })}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                  value.photoPublic === false ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-line text-ink-soft hover:border-amber-200'
                )}
              >
                비공개
              </button>
            </div>
          </div>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink-soft">
        <Checkbox
          checked={value.consentPublicDisplay}
          onCheckedChange={(v) => onChange({ ...value, consentPublicDisplay: v === true })}
          className="mt-0.5"
        />
        <span>실명·GA·소속 지점이 TOP 설계사 페이지와 랭킹에 공개되는 것에 동의합니다.</span>
      </label>
    </div>
  );
}
