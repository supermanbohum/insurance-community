'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { purchasePlannerMarketCreditsAction } from '@/lib/actions/planner-market-credits';
import { Button } from '@/components/ui/button';
import type { CreditPurchaseTierCode } from '@/types/database';

export interface CreditTier {
  tierCode: CreditPurchaseTierCode;
  creditCount: number;
  amountKrw: number;
  unitPriceKrw: number;
  isBest?: boolean;
}

/** 결제는 스텁(chargeOnce, 항상 성공)이다 - 실 PG 연동 전까지는 결제수단 선택 없이
 * 바로 구매된다(현재는 결제 구조와 DB만 설계, PG 연동은 이후 진행). */
export function CreditTierCard({ tier }: { tier: CreditTier }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function purchase() {
    startTransition(async () => {
      const result = await purchasePlannerMarketCreditsAction(tier.tierCode, 'card');
      if (result.success) {
        toast.success(`열람권 ${tier.creditCount}건이 지급되었습니다.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
      {tier.isBest && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">🔥BEST · 가장 인기</span>
      )}
      <p className="text-lg font-bold">{tier.creditCount.toLocaleString()}건</p>
      <p className="text-2xl font-extrabold text-brand-700">{tier.amountKrw.toLocaleString()}원</p>
      <p className="text-xs text-muted-foreground">(건당 {tier.unitPriceKrw.toLocaleString()}원)</p>
      <Button type="button" disabled={isPending} onClick={purchase} className="mt-2">
        {isPending ? '처리 중...' : '구매하기'}
      </Button>
    </div>
  );
}
