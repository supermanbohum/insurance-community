'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { STAR_TIER_LABEL, STAR_TIER_OPTIONS, type StarTier } from '@/lib/top-designer/labels';
import type { TopDesignerSort } from '@/lib/public/top-designer.supabase';

const SORT_LABEL: Record<TopDesignerSort, string> = { views: '조회순', likes: '좋아요순', newest: '최신순' };

/** 활동지역 필터는 뺐다 - TOP 설계사가 설계사마켓과 구조적으로 분리되면서 지역 필드
 * 자체가 없어졌다(오너 사양은 GA·소속만 요구했다). */
export function TopDesignerFilters({ initial }: { initial: { starTier: StarTier | null; sort: TopDesignerSort } }) {
  const router = useRouter();
  const [starTier, setStarTier] = useState<StarTier | 'all'>(initial.starTier ?? 'all');
  const [sort, setSort] = useState<TopDesignerSort>(initial.sort);

  function apply() {
    const params = new URLSearchParams();
    if (starTier !== 'all') params.set('starTier', starTier);
    if (sort !== 'newest') params.set('sort', sort);
    router.push(`/top-designer${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>별등급</Label>
          <Select value={starTier} onValueChange={(v) => setStarTier(v as StarTier | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {STAR_TIER_OPTIONS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {STAR_TIER_LABEL[tier]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>정렬</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as TopDesignerSort)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as TopDesignerSort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={apply} className="ml-auto">
          검색 적용
        </Button>
      </div>
    </div>
  );
}
