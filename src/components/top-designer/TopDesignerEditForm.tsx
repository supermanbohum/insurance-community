'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, ImagePlus, X } from 'lucide-react';
import {
  updateTopDesignerProfileAction,
  submitTopDesignerCertificationRevisionAction,
  uploadTopDesignerIncomeDocAction,
  uploadTopDesignerBusinessCardAction,
  uploadTopDesignerPhotoAction,
  type MyTopDesignerCertification,
} from '@/lib/actions/top-designer';
import { GaSearchSelect } from '@/components/auth/GaSearchSelect';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { normalizeImageFiles, HEIC_ACCEPT } from '@/lib/images/heic';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const REVISION_STATUS_LABEL: Record<string, string> = {
  pending_review: '재심사 대기 중',
  on_hold: '재심사 보류',
  rejected: '재심사 반려됨',
  approved: '재심사 승인됨',
};

/** E - 즉시 반영(자기소개/사진)과 재심사(직급/소속/연봉)를 별도 저장 버튼으로 분리한
 * 화면. 승인된 필드가 실제로 공개되는 값이라, 두 섹션을 한 폼/한 버튼으로 묶으면
 * "일부만 반영됐다"는 걸 사용자가 알기 어렵다 - 섹션마다 결과를 즉시 토스트로
 * 알린다. 재심사 섹션은 이미 대기/보류 중이면 새로 제출할 수 없게 막는다(RPC도
 * 동일하게 막지만, 폼에서 먼저 막아 시도 자체를 줄인다). */
export function TopDesignerEditForm({
  certification,
  gaOptions,
}: {
  certification: MyTopDesignerCertification;
  gaOptions: GaFilterOption[];
}) {
  const router = useRouter();
  const revisionLocked = certification.pendingRevision?.status === 'pending_review' || certification.pendingRevision?.status === 'on_hold';

  // 즉시 반영 섹션
  const [selfIntroduction, setSelfIntroduction] = useState(certification.selfIntroduction ?? '');
  const [careerYears, setCareerYears] = useState(certification.careerYears ? String(certification.careerYears) : '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPublic, setPhotoPublic] = useState<boolean | null>(certification.photoPublic);
  const [isSavingProfile, startProfileTransition] = useTransition();

  // 재심사 섹션
  const [jobTitle, setJobTitle] = useState(certification.jobTitle);
  const [gaCompanyId, setGaCompanyId] = useState<string | null>(certification.gaCompanyId);
  const [branchName, setBranchName] = useState(certification.branchName ?? '');
  const [declaredIncome, setDeclaredIncome] = useState(certification.declaredAnnualIncomeKrw ? String(certification.declaredAnnualIncomeKrw) : '');
  const [incomeDocFile, setIncomeDocFile] = useState<File | null>(null);
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [isSavingRevision, startRevisionTransition] = useTransition();

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    // 아이폰 HEIC → JPEG 변환(오너 지시 2026-08-18). 실패는 조용히 버리지 않는다.
    const { ok, failed } = await normalizeImageFiles([file]);
    if (failed.length > 0) {
      toast.error(`${failed[0].name}: ${failed[0].reason}`);
      return;
    }
    const picked = ok[0];
    if (!IMAGE_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp, 아이폰 사진(HEIC)만 업로드할 수 있습니다.');
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      toast.error('이미지는 최대 5MB까지 업로드할 수 있습니다.');
      return;
    }
    setPhotoFile(picked);
    setPhotoPublic(null);
  }

  async function pickDoc(files: FileList | null, setFile: (f: File | null) => void) {
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

  function saveProfile() {
    if (photoFile && photoPublic === null) {
      toast.error('프로필 사진 공개 여부를 선택해주세요.');
      return;
    }
    startProfileTransition(async () => {
      let photoPath: string | null = null;
      if (photoFile) {
        const fd = new FormData();
        fd.set('file', photoFile);
        const uploaded = await uploadTopDesignerPhotoAction(fd);
        if (!uploaded.success) {
          toast.error(uploaded.error);
          return;
        }
        photoPath = uploaded.path;
      }
      const result = await updateTopDesignerProfileAction({
        selfIntroduction,
        careerYears: careerYears ? Number(careerYears) : undefined,
        photoPath,
        photoPublic: photoFile ? photoPublic : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('자기소개·사진이 저장되었습니다.');
      router.refresh();
    });
  }

  function saveRevision() {
    if (!gaCompanyId || !jobTitle.trim() || !incomeDocFile || !businessCardFile) {
      toast.error('직급/소속 GA/원천징수영수증/명함을 모두 입력해주세요.');
      return;
    }
    startRevisionTransition(async () => {
      const docFd = new FormData();
      docFd.set('file', incomeDocFile);
      const uploadedDoc = await uploadTopDesignerIncomeDocAction(docFd);
      if (!uploadedDoc.success) {
        toast.error(uploadedDoc.error);
        return;
      }
      const cardFd = new FormData();
      cardFd.set('file', businessCardFile);
      const uploadedCard = await uploadTopDesignerBusinessCardAction(cardFd);
      if (!uploadedCard.success) {
        toast.error(uploadedCard.error);
        return;
      }
      const result = await submitTopDesignerCertificationRevisionAction({
        jobTitle,
        gaCompanyId: gaCompanyId!,
        branchName,
        declaredAnnualIncomeKrw: declaredIncome ? Number(declaredIncome) : undefined,
        incomeDocPath: uploadedDoc.path,
        businessCardPath: uploadedCard.path,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('재심사 신청이 접수되었습니다. 심사 중에도 현재 공개된 정보는 그대로 유지됩니다.');
      setIncomeDocFile(null);
      setBusinessCardFile(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 즉시 반영 */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line p-4">
        <div>
          <h2 className="text-sm font-bold text-ink">자기소개 · 사진</h2>
          <p className="mt-0.5 text-xs text-ink-faint">심사 없이 저장 즉시 공개 화면에 반영됩니다.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="td-edit-career">경력 (년, 선택)</Label>
          <Input id="td-edit-career" type="number" min={0} value={careerYears} onChange={(e) => setCareerYears(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="td-edit-intro">자기소개 (선택)</Label>
          <Textarea id="td-edit-intro" value={selfIntroduction} onChange={(e) => setSelfIntroduction(e.target.value)} rows={3} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>프로필 사진 (선택 - 새로 올리면 기존 사진을 대체합니다)</Label>
          {photoFile ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-line bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(photoFile)} alt="프로필 사진" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPublic(certification.photoPublic);
                }}
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="사진 삭제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-line text-center text-xs text-muted-foreground hover:border-amber-300 hover:text-amber-600">
              <ImagePlus className="h-5 w-5" />
              {certification.photoPath ? '사진 교체' : '사진 선택'}
              <input type="file" accept={`${IMAGE_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pickPhoto(e.target.files)} />
            </label>
          )}
          {!photoFile && certification.photoPath && (
            <p className="text-xs text-ink-faint">현재 {certification.photoPublic ? '공개' : '비공개'} 사진이 등록되어 있습니다.</p>
          )}
          {photoFile && (
            <div className="mt-1 flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">비공개를 선택하면 열람권을 사용해도 볼 수 없습니다.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoPublic(true)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                    photoPublic === true ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-line text-ink-soft hover:border-amber-200'
                  )}
                >
                  공개
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoPublic(false)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                    photoPublic === false ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-line text-ink-soft hover:border-amber-200'
                  )}
                >
                  비공개
                </button>
              </div>
            </div>
          )}
        </div>

        <Button onClick={saveProfile} disabled={isSavingProfile} className="self-start">
          {isSavingProfile ? '저장 중...' : '자기소개·사진 저장'}
        </Button>
      </section>

      {/* 재심사 */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-ink">직급 · 소속 GA · 지점 · 신고 연봉</h2>
          {certification.pendingRevision && (
            <Badge variant={certification.pendingRevision.status === 'rejected' ? 'destructive' : 'warning'}>
              {REVISION_STATUS_LABEL[certification.pendingRevision.status]}
            </Badge>
          )}
        </div>
        <p className="text-xs text-ink-faint">
          운영팀 재심사 후 반영됩니다. 심사 중에도 지금 공개된 별등급·소속 정보는 그대로 유지됩니다. 서류가 심사 완료 후
          파기되므로 원천징수영수증·명함을 다시 올려주세요.
        </p>
        {revisionLocked && certification.pendingRevision?.reviewReason && (
          <p className="text-xs text-amber-700">사유: {certification.pendingRevision.reviewReason}</p>
        )}

        <fieldset disabled={revisionLocked} className="flex flex-col gap-4 disabled:opacity-50">
          <div className="flex flex-col gap-1.5">
            <Label>소속 GA</Label>
            <GaSearchSelect options={gaOptions} value={gaCompanyId} onChange={setGaCompanyId} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-edit-branch">본부/지점 (선택)</Label>
            <Input id="td-edit-branch" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="예: 강남본부, 서초지점" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-edit-job-title">직급</Label>
            <Input id="td-edit-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="예: 설계사" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-edit-income">신고 연봉(원, 선택)</Label>
            <Input
              id="td-edit-income"
              type="number"
              value={declaredIncome}
              onChange={(e) => setDeclaredIncome(e.target.value)}
              placeholder="예: 300000000"
            />
          </div>

          <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface-sunken p-4">
            <Label>원천징수영수증 재제출</Label>
            {incomeDocFile ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 truncate text-ink-soft">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{incomeDocFile.name}</span>
                </span>
                <button type="button" onClick={() => setIncomeDocFile(null)} aria-label="파일 삭제">
                  <X className="h-4 w-4 text-ink-faint" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-amber-300 hover:text-amber-600">
                <FileText className="h-4 w-4" />
                파일 선택 (jpg/png/pdf)
                <input type="file" accept={`${DOC_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pickDoc(e.target.files, setIncomeDocFile)} />
              </label>
            )}
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              <span className="font-semibold text-ink-soft">주민등록번호는 가리고(마스킹) 올려주세요.</span> 서류는 심사 후 즉시
              파기됩니다.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface-sunken p-4">
            <Label>명함 재제출</Label>
            {businessCardFile ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 truncate text-ink-soft">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{businessCardFile.name}</span>
                </span>
                <button type="button" onClick={() => setBusinessCardFile(null)} aria-label="파일 삭제">
                  <X className="h-4 w-4 text-ink-faint" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-amber-300 hover:text-amber-600">
                <FileText className="h-4 w-4" />
                파일 선택 (jpg/png/pdf)
                <input type="file" accept={`${DOC_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pickDoc(e.target.files, setBusinessCardFile)} />
              </label>
            )}
          </div>

          <Button onClick={saveRevision} disabled={isSavingRevision} className="self-start">
            {isSavingRevision ? '제출 중...' : '재심사 신청'}
          </Button>
        </fieldset>
      </section>
    </div>
  );
}
