'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { purchasePlannerMarketCreditsAction } from '@/lib/actions/planner-market-credits';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CreditPurchaseTierCode } from '@/types/database';

export interface CreditTier {
  tierCode: CreditPurchaseTierCode;
  creditCount: number;
  amountKrw: number;
  unitPriceKrw: number;
  /** 할인 전 정가 - 있으면 취소선과 함께 표시된다. */
  originalAmountKrw?: number;
  discountLabel?: string;
  isBest?: boolean;
}

/** 카드 5개가 항상 같은 높이/같은 위치에 제목·가격·할인문구·버튼이 오도록
 * flex flex-col h-full + 버튼 mt-auto로 고정한다. 할인문구가 없는 카드도
 * 자리를 그대로 차지하는 placeholder를 넣어 세로 정렬이 흔들리지 않게 한다.
 * 결제는 스텁(chargeOnce, 항상 성공)이다 - 실 PG 연동 전까지는 결제수단 선택
 * 없이 바로 구매된다(현재는 결제 구조와 DB만 설계, PG 연동은 이후 진행). */
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
    <div
      className={cn(
        'relative flex h-full flex-col gap-1.5 rounded-2xl border p-5 pt-6',
        tier.isBest
          ? 'border-2 border-amber-400 bg-gradient-to-b from-amber-50 via-white to-white shadow-card-hover'
          : 'border-line bg-white shadow-card'
      )}
    >
      {tier.isBest && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-md">
          <Sparkles className="h-3 w-3" />
          BEST · 가장 인기
        </span>
      )}

      <p className={cn('text-lg font-bold', tier.isBest ? 'text-amber-700' : 'text-ink')}>{tier.creditCount.toLocaleString()}건</p>
      <p className={cn('text-2xl font-extrabold', tier.isBest ? 'text-amber-600' : 'text-brand-700')}>{tier.amountKrw.toLocaleString()}원</p>

      {tier.originalAmountKrw ? (
        <p className="text-xs">
          <span className="text-ink-faint line-through">{tier.originalAmountKrw.toLocaleString()}원</span>{' '}
          <span className="font-bold text-rose-500">{tier.discountLabel}</span>
        </p>
      ) : (
        <p className="text-xs text-transparent" aria-hidden="true">
          -
        </p>
      )}

      <p className="text-xs text-muted-foreground">(건당 {tier.unitPriceKrw.toLocaleString()}원)</p>

      <Button
        type="button"
        disabled={isPending}
        onClick={purchase}
        className={cn('mt-auto', tier.isBest && 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600')}
      >
        {isPending ? '처리 중...' : '구매하기'}
      </Button>
    </div>
  );
}
