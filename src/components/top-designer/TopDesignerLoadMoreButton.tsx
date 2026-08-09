'use client';

import { useState, useTransition } from 'react';
import { loadMoreTopDesignersAction } from '@/lib/actions/top-designer';
import type { PublicTopDesignerCardSummary, TopDesignerSort } from '@/lib/public/top-designer.supabase';
import type { StarTier } from '@/lib/top-designer/labels';
import { TopDesignerCard } from '@/components/top-designer/TopDesignerCard';
import { Button } from '@/components/ui/button';

export function TopDesignerLoadMoreButton({
  initialCount,
  filters,
}: {
  initialCount: number;
  filters: { starTier?: StarTier; sort?: TopDesignerSort };
}) {
  const [items, setItems] = useState<PublicTopDesignerCardSummary[]>([]);
  const [exhausted, setExhausted] = useState(initialCount < 24);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const next = await loadMoreTopDesignersAction(filters, initialCount + items.length);
      if (next.length < 24) setExhausted(true);
      setItems((prev) => [...prev, ...next]);
    });
  }

  return (
    <>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((designer) => (
            <TopDesignerCard key={designer.id} designer={designer} />
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
