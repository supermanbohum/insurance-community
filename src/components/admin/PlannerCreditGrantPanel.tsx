'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adjustPlannerMarketCreditsAction } from '@/lib/actions/planner-market-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const QUICK_AMOUNTS = [1, 5, 10, 50];
const DEFAULT_REASON = '관리자 지급';

/** 열람권 지급 - 회사 검색 결과에서 선택된 GA사에 대해 빠른 버튼/직접 입력으로 개수를
 * 고르고 지급한다. 사유는 선택 입력이며, 비워두면 "관리자 지급"으로 기록된다(감사로그
 * 자체는 admin_adjust_planner_market_credits RPC가 항상 사유를 요구하므로 - 기존
 * RPC/서버 액션은 그대로 두고 이 화면에서만 기본값을 채워 보낸다). */
export function PlannerCreditGrantPanel({ gaCompanyId, gaCompanyName }: { gaCompanyId: string; gaCompanyName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [mode, setMode] = useState<'grant' | 'deduct'>('grant');
  const [reason, setReason] = useState('');

  const parsedCustom = Number(customAmount);
  const selectedAmount = customAmount.trim() ? parsedCustom : amount;
  const canSubmit = !!selectedAmount && Number.isInteger(selectedAmount) && selectedAmount > 0;

  function submit() {
    if (!canSubmit || !selectedAmount) return;
    const delta = mode === 'grant' ? selectedAmount : -selectedAmount;
    startTransition(async () => {
      const result = await adjustPlannerMarketCreditsAction(gaCompanyId, delta, reason.trim() || DEFAULT_REASON);
      if (result.success) {
        toast.success(`${gaCompanyName}에 열람권 ${Math.abs(delta)}개를 ${mode === 'grant' ? '지급' : '차감'}했습니다.`);
        setAmount(null);
        setCustomAmount('');
        setReason('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === 'grant' ? 'default' : 'outline'} onClick={() => setMode('grant')}>
          지급
        </Button>
        <Button type="button" size="sm" variant={mode === 'deduct' ? 'default' : 'outline'} onClick={() => setMode('deduct')}>
          차감
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setAmount(n);
              setCustomAmount('');
            }}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              amount === n && !customAmount.trim() ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            +{n}
          </button>
        ))}
        <Input
          type="number"
          min={1}
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(null);
          }}
          placeholder="직접 입력"
          className="w-28"
        />
      </div>

      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="지급 사유 (선택)" rows={2} />

      <Button disabled={isPending || !canSubmit} onClick={submit} className="w-fit">
        {mode === 'grant' ? '지급하기' : '차감하기'}
      </Button>
    </div>
  );
}
