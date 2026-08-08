'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { submitPlannerCertificationAction } from '@/lib/actions/planners';
import { INCOME_TIER_OPTIONS } from '@/lib/planners/tier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PlannerIncomeTier } from '@/types/database';

export function PlannerCertificationForm({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [plannerName, setPlannerName] = useState('');
  const [plannerPhone, setPlannerPhone] = useState('');
  const [plannerCompany, setPlannerCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [incomeTier, setIncomeTier] = useState<PlannerIncomeTier>('tier_1');
  const [doc, setDoc] = useState<File | null>(null);

  const canSubmit = branchId && plannerName.trim() && plannerPhone.trim() && plannerCompany.trim() && jobTitle.trim() && doc;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !doc) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set('file', doc);
      const result = await submitPlannerCertificationAction(
        { branchId, plannerName, plannerPhone, plannerCompany, jobTitle, incomeTier },
        formData
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('등록 신청이 접수되었습니다. 운영팀 승인 후 인증됩니다.');
      router.push('/partner/planners');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">설계사 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pcf-branch">등록 지점</Label>
            <select
              id="pcf-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pcf-name">이름</Label>
            <Input id="pcf-name" value={plannerName} onChange={(e) => setPlannerName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pcf-phone">연락처</Label>
            <Input id="pcf-phone" value={plannerPhone} onChange={(e) => setPlannerPhone(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pcf-company">회사</Label>
            <Input id="pcf-company" value={plannerCompany} onChange={(e) => setPlannerCompany(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pcf-title">직책</Label>
            <Input id="pcf-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="예: 보험설계사" required />
            <p className="text-xs text-muted-foreground">대표/총괄/사업단장/본부장/지점장/임원 등 관리자 직책은 등록할 수 없습니다.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">연봉 구간</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {INCOME_TIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIncomeTier(opt.value)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  incomeTier === opt.value ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-soft hover:border-brand-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">원천징수영수증 (필수)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">운영팀 승인용으로만 사용되며, 실제 서류/연봉은 외부에 절대 공개되지 않습니다.</p>
          {doc ? (
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 truncate text-ink-soft">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{doc.name}</span>
              </span>
              <button type="button" onClick={() => setDoc(null)} className="text-xs text-destructive">
                삭제
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-6 text-center text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-600">
              <FileText className="h-4 w-4" />
              파일 선택 (jpg/png/pdf)
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending || !canSubmit} size="lg">
        {isPending ? '제출 중...' : '등록 신청'}
      </Button>
    </form>
  );
}
