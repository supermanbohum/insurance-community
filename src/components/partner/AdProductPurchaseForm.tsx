'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { purchaseBranchAdProductAction } from '@/lib/actions/ad-products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdProductCatalogItem } from '@/lib/ad-products/catalog';

function defaultDates(): { start: string; end: string } {
  const now = new Date();
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { start: toLocal(now), end: toLocal(in30days) };
}

/** 광고 상품 구매 - 본인 소속 지점 중 선택, 기간 지정. 결제는 스텁(항상 성공)이고
 * 구매 즉시 운영팀 승인 대기 상태로 들어간다(즉시 노출되지 않음). */
export function AdProductPurchaseForm({ product, branches }: { product: AdProductCatalogItem; branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState<string>('');
  const [dates, setDates] = useState(defaultDates);

  function submit() {
    if (!branchId) {
      toast.error('지점을 선택해주세요.');
      return;
    }
    startTransition(async () => {
      const result = await purchaseBranchAdProductAction(
        branchId,
        product.type,
        new Date(dates.start).toISOString(),
        new Date(dates.end).toISOString(),
        'card'
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('구매가 접수되었습니다. 운영팀 승인 후 노출됩니다.');
      router.push('/partner/ad-products/history');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-bold">{product.label} 구매 - {Math.round(product.priceKrw * 1.1).toLocaleString()}원 (VAT 포함)</p>
      <div className="flex flex-col gap-1.5">
        <Label>지점 선택</Label>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger>
            <SelectValue placeholder="지점을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>시작일시</Label>
          <Input type="datetime-local" value={dates.start} onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>종료일시</Label>
          <Input type="datetime-local" value={dates.end} onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} />
        </div>
      </div>
      <Button type="button" disabled={isPending} onClick={submit}>
        {isPending ? '처리 중...' : '구매하기'}
      </Button>
    </div>
  );
}
