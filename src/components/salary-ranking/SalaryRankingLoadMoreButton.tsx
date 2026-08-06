'use client';

import { useState, useTransition } from 'react';
import { loadMoreSalaryRankingAction } from '@/lib/actions/salary-ranking';
import type { PublicSalaryRankingCardSummary, SalaryRankingSort } from '@/lib/public/salary-ranking.supabase';
import { SalaryRankingCard } from '@/components/salary-ranking/SalaryRankingCard';
import { Button } from '@/components/ui/button';

export function SalaryRankingLoadMoreButton({
  initialCount,
  filters,
}: {
  initialCount: number;
  filters: { year: number; sort?: SalaryRankingSort };
}) {
  const [items, setItems] = useState<PublicSalaryRankingCardSummary[]>([]);
  const [exhausted, setExhausted] = useState(initialCount < 50);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const next = await loadMoreSalaryRankingAction(filters, initialCount + items.length);
      if (next.length < 50) setExhausted(true);
      setItems((prev) => [...prev, ...next]);
    });
  }

  return (
    <>
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((submission, i) => (
            <SalaryRankingCard key={submission.id} submission={submission} rank={initialCount + i + 1} />
          ))}
        </div>
      )}
      {!exhausted && (
        <Button type="button" variant="outline" disabled={isPending} onClick={loadMore} className="mx-auto">
          {isPending ? '불러오는 중...' : '더보기'}
        </Button>
      )}
    </>
  );
}
