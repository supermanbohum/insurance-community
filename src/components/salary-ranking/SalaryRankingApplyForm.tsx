'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';
import { submitSalaryRankingAction } from '@/lib/actions/salary-ranking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function SalaryRankingApplyForm({ plannerProfileId }: { plannerProfileId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();
  const [rankingYear, setRankingYear] = useState(currentYear);
  const [jobTitle, setJobTitle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [declaredIncome, setDeclaredIncome] = useState('');
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const canSubmit = jobTitle.trim() && displayName.trim() && declaredIncome && consent && file;

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
    setFile(picked);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('file', file!);
      const result = await submitSalaryRankingAction(
        plannerProfileId,
        {
          rankingYear,
          jobTitle,
          displayName,
          declaredAnnualIncomeKrw: Number(declaredIncome),
          consentPublicDisplay: consent,
        },
        fd
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('연봉 랭킹 등록 신청이 접수되었습니다. 관리자 승인 후 공개됩니다.');
      router.push('/planner-market/my');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>등록 연도</Label>
        <Select value={String(rankingYear)} onValueChange={(v) => setRankingYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(currentYear)}>{currentYear}년 (올해)</SelectItem>
            <SelectItem value={String(currentYear - 1)}>{currentYear - 1}년 (직전년도)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sr-display-name">랭킹에 공개될 이름</Label>
        <Input id="sr-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="실명이 아니어도 됩니다" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sr-job-title">직급</Label>
        <Input id="sr-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="예: 설계사" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sr-income">신고 연봉(원)</Label>
        <Input id="sr-income" type="number" value={declaredIncome} onChange={(e) => setDeclaredIncome(e.target.value)} placeholder="예: 1200000000" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>원천징수영수증</Label>
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
            <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickFile(e.target.files)} />
          </label>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink-soft">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span>연봉 랭킹 페이지에 위 이름과 연봉이 공개되는 것에 동의합니다.</span>
      </label>
      <Button type="submit" disabled={isPending || !canSubmit} size="lg">
        {isPending ? '제출 중...' : '연봉 랭킹 등록 신청'}
      </Button>
    </form>
  );
}
