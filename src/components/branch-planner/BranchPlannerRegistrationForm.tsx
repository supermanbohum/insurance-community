'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';
import {
  submitBranchPlannerRegistrationAction,
  uploadBranchPlannerBusinessCardAction,
  uploadBranchPlannerIncomeDocAction,
  recordBranchPlannerGateEventAction,
} from '@/lib/actions/branch-planner-registrations';
import { BranchSearchField } from '@/components/branch-planner/BranchSearchField';
import { BranchPlannerGate } from '@/components/branch-planner/BranchPlannerGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { BranchSearchResultLite } from '@/lib/public/branch';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// 오너 확정 목록(2026-08-10, 그대로 간다) - "설계사" 항목 없음, 관리직 차단 없음(⑩과 동일 원칙).
const JOB_TITLE_OPTIONS = ['대표', '본부장', '사업단장', '지점장', '부지점장', '팀장'] as const;
const OTHER = '기타' as const;

export interface BranchPlannerRegistrationInitial {
  branch: BranchSearchResultLite;
  name: string;
  jobTitle: string;
}

/** ③ ⓑ "우리 지점 설계사 등록" 폼 - 등록/수정이 같은 폼이다(RPC가 on-conflict-do-update,
 * 0087 참고). initial이 있으면 수정 모드로 prefill한다(수정 페이지가 "사실상 없다"고
 * 판정됐던 이유가 prefill 부재였다 - 같은 실수를 반복하지 않는다). */
export function BranchPlannerRegistrationForm({
  initial,
  userName,
}: {
  initial?: BranchPlannerRegistrationInitial;
  userName: string;
}) {
  const router = useRouter();
  const [branch, setBranch] = useState<BranchSearchResultLite | null>(initial?.branch ?? null);
  const [showGate, setShowGate] = useState(false);
  const [name, setName] = useState(initial?.name || userName);
  const initialIsOther = initial ? !JOB_TITLE_OPTIONS.includes(initial.jobTitle as (typeof JOB_TITLE_OPTIONS)[number]) : false;
  const [jobTitleOption, setJobTitleOption] = useState<string>(initial ? (initialIsOther ? OTHER : initial.jobTitle) : '');
  const [jobTitleOther, setJobTitleOther] = useState(initialIsOther ? initial!.jobTitle : '');
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [incomeDocFile, setIncomeDocFile] = useState<File | null>(null);
  const [declaredIncome, setDeclaredIncome] = useState('');
  const [isPending, setIsPending] = useState(false);

  const jobTitle = jobTitleOption === OTHER ? jobTitleOther.trim() : jobTitleOption;
  const canSubmit =
    branch && name.trim() && jobTitle && businessCardFile && (!incomeDocFile || declaredIncome.trim());

  function handleNotFound() {
    setShowGate(true);
    recordBranchPlannerGateEventAction('blocked');
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
    setBusinessCardFile(picked);
  }

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
    setIncomeDocFile(picked);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !branch) {
      toast.error('지점/이름/직급/명함을 모두 입력해주세요. 소득증빙을 첨부했다면 신고 연봉도 입력해주세요.');
      return;
    }

    setIsPending(true);
    (async () => {
      const cardFd = new FormData();
      cardFd.set('file', businessCardFile!);
      const uploadedCard = await uploadBranchPlannerBusinessCardAction(cardFd);
      if (!uploadedCard.success) {
        toast.error(uploadedCard.error);
        setIsPending(false);
        return;
      }

      let incomeDocPath: string | null = null;
      if (incomeDocFile) {
        const docFd = new FormData();
        docFd.set('file', incomeDocFile);
        const uploadedDoc = await uploadBranchPlannerIncomeDocAction(docFd);
        if (!uploadedDoc.success) {
          toast.error(uploadedDoc.error);
          setIsPending(false);
          return;
        }
        incomeDocPath = uploadedDoc.path;
      }

      const result = await submitBranchPlannerRegistrationAction({
        branchId: branch.id,
        name,
        jobTitle,
        businessCardPath: uploadedCard.path,
        incomeDocPath,
        declaredAnnualIncomeKrw: incomeDocFile ? Number(declaredIncome) : null,
      });
      setIsPending(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? '수정 내용이 접수되었습니다.' : '등록이 접수되었습니다. 운영팀 승인 후 지점 페이지에 표시됩니다.');
      router.push('/');
      router.refresh();
    })();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-ink-soft">
        설계사 본인이 직접 등록합니다. 소속 지점을 연결해야 등록할 수 있으며, 등록하면 지점 페이지에 함께 표시됩니다.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label>소속 지점</Label>
        <BranchSearchField value={branch} onChange={setBranch} onNotFound={handleNotFound} />
      </div>

      {!branch && showGate && <BranchPlannerGate />}

      {branch && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bp-name">이름</Label>
            <Input id="bp-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>직급</Label>
            <div className="grid grid-cols-3 gap-2">
              {[...JOB_TITLE_OPTIONS, OTHER].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setJobTitleOption(opt)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    jobTitleOption === opt
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-line bg-white text-ink-soft hover:border-brand-200'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            {jobTitleOption === OTHER && (
              <Input
                value={jobTitleOther}
                onChange={(e) => setJobTitleOther(e.target.value)}
                placeholder="직급을 입력하세요"
                className="mt-1"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface-sunken p-4">
            <Label>명함 (필수) · 소속·직급 증명</Label>
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
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
                <FileText className="h-4 w-4" />
                파일 선택 (jpg/png/pdf)
                <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickBusinessCard(e.target.files)} />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface-sunken p-4">
            <Label>소득증빙 (선택) · 원천징수영수증</Label>
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
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white py-4 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
                <FileText className="h-4 w-4" />
                파일 선택 (jpg/png/pdf)
                <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickIncomeDoc(e.target.files)} />
              </label>
            )}
            {incomeDocFile && (
              <div className="flex flex-col gap-1.5 pt-1">
                <Label htmlFor="bp-income">신고 연봉(원)</Label>
                <Input
                  id="bp-income"
                  type="number"
                  value={declaredIncome}
                  onChange={(e) => setDeclaredIncome(e.target.value)}
                  placeholder="예: 100000000"
                />
              </div>
            )}
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              첨부하지 않아도 등록됩니다. 다만 TOP 인증은 받을 수 없고, 지점 점수에는 &apos;1억 미만&apos;으로 집계됩니다.
            </p>
          </div>

          <Button type="submit" disabled={isPending || !canSubmit} size="lg">
            {isPending ? '제출 중...' : initial ? '수정 내용 저장' : '등록하기'}
          </Button>
        </>
      )}
    </form>
  );
}
