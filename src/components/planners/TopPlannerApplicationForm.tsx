'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Search, X } from 'lucide-react';
import { searchBranchesForTopPlannerAction, submitTopPlannerApplicationAction } from '@/lib/actions/top-planner-applications';
import { INCOME_TIER_OPTIONS } from '@/lib/planners/tier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BranchSearchResultLite } from '@/lib/public/branch';
import type { PlannerIncomeTier } from '@/types/database';
import { normalizeImageFiles } from '@/lib/images/heic';

export function TopPlannerApplicationForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [branchQuery, setBranchQuery] = useState('');
  const [branchResults, setBranchResults] = useState<BranchSearchResultLite[]>([]);
  const [branchSearchOpen, setBranchSearchOpen] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchSearchResultLite | null>(null);

  const [plannerName, setPlannerName] = useState('');
  const [plannerPhone, setPlannerPhone] = useState('');
  const [plannerCompany, setPlannerCompany] = useState('');
  const [incomeTier, setIncomeTier] = useState<PlannerIncomeTier>('tier_1');
  const [doc, setDoc] = useState<File | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = branchQuery.trim();
    if (!trimmed) {
      setBranchResults([]);
      setBranchLoading(false);
      return;
    }
    setBranchLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchBranchesForTopPlannerAction(trimmed);
      setBranchResults(results);
      setBranchLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [branchQuery]);

  const canSubmit =
    selectedBranch && plannerName.trim() && plannerPhone.trim() && plannerCompany.trim() && doc;

  async function pickDoc(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      setDoc(null);
      return;
    }
    // 아이폰 HEIC → JPEG 변환(오너 지시 2026-08-18). 실패는 조용히 버리지 않는다.
    const { ok, failed } = await normalizeImageFiles([file]);
    if (failed.length > 0) {
      toast.error(`${failed[0].name}: ${failed[0].reason}`);
      return;
    }
    setDoc(ok[0]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedBranch || !doc) return;

    setIsPending(true);
    const formData = new FormData();
    formData.set('file', doc);
    submitTopPlannerApplicationAction(
      {
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
        plannerName,
        plannerPhone,
        plannerCompany,
        incomeTier,
      },
      formData
    )
      .then((result) => {
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('신청이 접수되었습니다. 운영팀 승인 후 지점 페이지에 배지가 노출됩니다.');
        router.push('/');
        router.refresh();
      })
      .finally(() => setIsPending(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">본인 지점 검색</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {selectedBranch ? (
            <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{selectedBranch.name}</p>
                <p className="truncate text-xs text-ink-faint">
                  {selectedBranch.gaCompanyName}
                  {selectedBranch.sidoName && ` · ${selectedBranch.sidoName}${selectedBranch.sigunguName ? ` ${selectedBranch.sigunguName}` : ''}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranch(null);
                  setBranchQuery('');
                }}
                className="shrink-0 rounded-full p-1.5 text-ink-faint hover:bg-white"
                aria-label="지점 선택 변경"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={branchQuery}
                onChange={(e) => setBranchQuery(e.target.value)}
                onFocus={() => setBranchSearchOpen(true)}
                onBlur={() => setTimeout(() => setBranchSearchOpen(false), 150)}
                placeholder="지점명 / 지역 / GA명을 입력하세요"
                autoComplete="off"
                className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
              />
              {branchSearchOpen && branchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-card-hover">
                  {branchLoading ? (
                    <p className="px-3 py-3 text-center text-xs text-ink-faint">검색 중...</p>
                  ) : branchResults.length === 0 ? (
                    <p className="px-3 py-3 text-center text-xs text-ink-faint">일치하는 지점이 없습니다.</p>
                  ) : (
                    branchResults.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedBranch(b);
                          setBranchSearchOpen(false);
                        }}
                        className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-surface-sunken"
                      >
                        <span className="truncate text-sm font-semibold text-ink">{b.name}</span>
                        <span className="truncate text-xs text-ink-faint">
                          {b.gaCompanyName}
                          {b.sidoName && ` · ${b.sidoName}${b.sigunguName ? ` ${b.sigunguName}` : ''}`}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">보험맵에 등록·승인된 지점만 검색됩니다.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">신청자 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpa-name">이름</Label>
            <Input id="tpa-name" value={plannerName} onChange={(e) => setPlannerName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpa-phone">연락처</Label>
            <Input id="tpa-phone" value={plannerPhone} onChange={(e) => setPlannerPhone(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpa-company">회사</Label>
            <Input id="tpa-company" value={plannerCompany} onChange={(e) => setPlannerCompany(e.target.value)} required />
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
                  incomeTier === opt.value
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-line bg-white text-ink-soft hover:border-brand-200'
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
                accept="image/jpeg,image/png,image/webp,application/pdf,.heic,.heif"
                className="hidden"
                onChange={(e) => pickDoc(e.target.files)}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending || !canSubmit} size="lg">
        {isPending ? '제출 중...' : '신청하기'}
      </Button>
    </form>
  );
}
