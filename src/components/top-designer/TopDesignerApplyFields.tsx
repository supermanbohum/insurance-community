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
  businessCardFile: File | null;
  photoFile: File | null;
  photoPublic: boolean | null;
  consentPublicDisplay: boolean;
  consentDocumentCollection: boolean;
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
  businessCardFile: null,
  photoFile: null,
  photoPublic: null,
  consentPublicDisplay: false,
  consentDocumentCollection: false,
};

/** TOP 설계사 인증 신청 입력 - 설계사마켓과 완전 분리된 자체 필드다(오너 지시,
 * planner_profiles를 전혀 참조하지 않는다). 관리직(대표/본부장/지점장 등)은
 * 서버(is_blocked_designer_job_title)에서 최종 차단되므로, 여기서는 안내 문구로만
 * 미리 알려준다.
 *
 * 서류 카드를 원천징수영수증/명함 둘로 분리했다(소득 증명 vs 소속·직급 증명 - 오너
 * 지시로 명함 추가) - 마스킹 안내는 원천징수영수증 카드에만 붙는다(주민등록번호가
 * 있는 서류는 그것뿐이라 명함에 붙이면 불필요한 불안만 준다).
 *
 * 동의 문구는 콘텐츠팀 확정본(top-consent-privacy.md, 2026-08-09) 그대로다 - 공개
 * 동의와 서류수집 동의는 성격이 달라 체크박스를 분리했고, 사전 체크는 하지 않는다. */
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

  function pickIncomeDoc(files: FileList | null) {
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

  function pickBusinessCard(files: FileList | null) {
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
    onChange({ ...value, businessCardFile: picked });
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
        원천징수영수증과 명함으로 소득·소속을 증빙한 설계사에게 별등급(⭐1억~10억)을 부여합니다. 대표/본부장/지점장/단장/센터장
        등 관리직은 신청할 수 없습니다. 실명·GA·소속 지점은 승인되면 TOP 설계사 페이지와 랭킹에 공개됩니다.
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

      {/* 증빙 서류 카드 1 - 원천징수영수증(소득 증명). 마스킹 안내는 이 카드에만. */}
      <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface-sunken p-4">
        <Label>원천징수영수증 · 소득 증명 · 별등급의 근거</Label>
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
            <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickIncomeDoc(e.target.files)} />
          </label>
        )}
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
          <span className="font-semibold text-ink-soft">주민등록번호는 가리고(마스킹) 올려주세요.</span> 보험맵은 주민등록번호를
          받지 않습니다.
          <br />
          서류는 심사 후 즉시 파기됩니다.
        </p>
      </div>

      {/* 증빙 서류 카드 2 - 명함(소속·직급 증명). 마스킹 안내 없음. */}
      <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface-sunken p-4">
        <Label>명함 · 소속 증명 · GA·본부·직급의 근거</Label>
        {value.businessCardFile ? (
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 truncate text-ink-soft">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{value.businessCardFile.name}</span>
            </span>
            <button type="button" onClick={() => onChange({ ...value, businessCardFile: null })} aria-label="파일 삭제">
              <X className="h-4 w-4 text-ink-faint" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-amber-300 hover:text-amber-600">
            <FileText className="h-4 w-4" />
            파일 선택 (jpg/png/pdf)
            <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickBusinessCard(e.target.files)} />
          </label>
        )}
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
          소속과 직급 확인을 위해 명함을 올려주세요. 명함의 연락처는 공개되지 않으며, 서류는 심사 후 즉시 파기됩니다.
        </p>
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

      {/* 동의 1 - 공개 동의(이 인증의 본질). "승인되면"으로 시점 한정. */}
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink-soft">
        <Checkbox
          checked={value.consentPublicDisplay}
          onCheckedChange={(v) => onChange({ ...value, consentPublicDisplay: v === true })}
          className="mt-0.5"
        />
        <span>
          (필수) 승인되면 실명·소속(GA·본부/지점)·별등급이 TOP 설계사 페이지와 랭킹에 공개되는 것에 동의합니다.
          <br />
          <span className="text-xs text-ink-faint">정확한 연봉 금액은 공개되지 않습니다 — 화면에는 별등급만 표시됩니다.</span>
        </span>
      </label>

      {/* 동의 2 - 서류 수집 동의. */}
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink-soft">
        <Checkbox
          checked={value.consentDocumentCollection}
          onCheckedChange={(v) => onChange({ ...value, consentDocumentCollection: v === true })}
          className="mt-0.5"
        />
        <span>
          (필수) 인증 심사를 위해 원천징수영수증(주민등록번호 제외)·명함·신고 연봉을 수집·이용하는 데 동의합니다. 서류는
          심사에만 사용되며, 심사가 끝나면 지체 없이 파기됩니다.{' '}
          <a href="/privacy#3" target="_blank" rel="noopener noreferrer" className="underline">
            전문 보기
          </a>
        </span>
      </label>
    </div>
  );
}
