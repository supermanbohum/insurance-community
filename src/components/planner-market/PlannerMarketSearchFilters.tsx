'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RegionRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function PlannerMarketSearchFilters({
  regions,
  initial,
}: {
  regions: RegionRow[];
  initial: { regionId: string | null; minCareerYears: string; incomeVerifiedOnly: boolean };
}) {
  const router = useRouter();
  const [regionId, setRegionId] = useState<string | null>(initial.regionId);
  const [minCareerYears, setMinCareerYears] = useState(initial.minCareerYears);
  const [incomeVerifiedOnly, setIncomeVerifiedOnly] = useState(initial.incomeVerifiedOnly);

  function apply() {
    const params = new URLSearchParams();
    if (regionId) params.set('region', regionId);
    if (minCareerYears) params.set('minCareer', minCareerYears);
    if (incomeVerifiedOnly) params.set('incomeVerified', '1');
    router.push(`/planner-market/search${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <div>
        <Label>활동지역</Label>
        <div className="mt-1.5">
          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pm-filter-career">최소 경력(년)</Label>
          <Input
            id="pm-filter-career"
            type="number"
            min={0}
            className="w-28"
            value={minCareerYears}
            onChange={(e) => setMinCareerYears(e.target.value)}
          />
        </div>
        <label
          className={cn(
            'mb-2 flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors',
            incomeVerifiedOnly ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-line text-ink-soft hover:border-amber-200'
          )}
        >
          <Checkbox checked={incomeVerifiedOnly} onCheckedChange={(v) => setIncomeVerifiedOnly(v === true)} />
          <span>🏅 직전연봉 인증 설계사만 보기</span>
        </label>
        <Button type="button" onClick={apply} className="ml-auto">
          검색 적용
        </Button>
      </div>
    </div>
  );
}
