'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { SalaryRankingSort } from '@/lib/public/salary-ranking.supabase';

const SORT_LABEL: Record<SalaryRankingSort, string> = { income: '연봉순', views: '조회순', newest: '최신순' };

export function SalaryRankingFilters({ years, initial }: { years: number[]; initial: { year: number; sort: SalaryRankingSort } }) {
  const router = useRouter();
  const [year, setYear] = useState(initial.year);
  const [sort, setSort] = useState<SalaryRankingSort>(initial.sort);

  function apply() {
    const params = new URLSearchParams();
    if (sort !== 'income') params.set('sort', sort);
    router.push(`/salary-ranking${params.toString() ? `?year=${year}&${params.toString()}` : `?year=${year}`}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-col gap-1.5">
        <Label>연도</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>정렬</Label>
        <Select value={sort} onValueChange={(v) => setSort(v as SalaryRankingSort)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as SalaryRankingSort[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" onClick={apply} className="ml-auto">
        적용
      </Button>
    </div>
  );
}
