'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdProductPurchaseForm } from '@/components/partner/AdProductPurchaseForm';
import { AD_PRODUCT_CATALOG } from '@/lib/ad-products/catalog';
import { PAYMENTS_LIVE } from '@/lib/config/payments';
import type { AdProductType } from '@/types/database';

/** 광고 상품 카탈로그 - 향후 상품이 추가돼도 AD_PRODUCT_CATALOG 배열만 늘리면 이 화면은
 * 그대로 동작한다. isLive=false 상품은 결제/승인 인프라는 있지만 아직 준비중으로 표시.
 * PAYMENTS_LIVE=false인 동안은 결제 프로바이더가 스텁(항상 성공)이라 isLive 여부와
 * 무관하게 가격/구매 버튼을 아예 노출하지 않는다(토스 등록 전 결제 경로 차단, CTO 방침). */
export function AdProductCatalog({ branches }: { branches: { id: string; name: string }[] }) {
  const [selectedType, setSelectedType] = useState<AdProductType | null>(null);
  const selected = AD_PRODUCT_CATALOG.find((item) => item.type === selectedType) ?? null;

  if (!PAYMENTS_LIVE) {
    return <p className="text-sm text-muted-foreground">현재 광고 상품 구매는 열려있지 않습니다. 문의는 고객센터로 연락해주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AD_PRODUCT_CATALOG.map((item) => (
          <div key={item.type} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">{item.label}</p>
              {!item.isLive && <Badge variant="outline">준비중</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
            <p className="text-sm font-bold text-brand-700">{Math.round(item.priceKrw * 1.1).toLocaleString()}원 (VAT 포함)</p>
            <Button
              type="button"
              size="sm"
              variant={selectedType === item.type ? 'default' : 'outline'}
              disabled={!item.isLive || branches.length === 0}
              onClick={() => setSelectedType(selectedType === item.type ? null : item.type)}
            >
              {selectedType === item.type ? '선택됨' : '구매하기'}
            </Button>
          </div>
        ))}
      </div>

      {branches.length === 0 && <p className="text-sm text-muted-foreground">승인된 지점이 있어야 광고 상품을 구매할 수 있습니다.</p>}

      {selected && <AdProductPurchaseForm product={selected} branches={branches} />}
    </div>
  );
}
