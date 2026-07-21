'use client';

import { useMemo, useState } from 'react';
import type { RegionRow } from '@/lib/admin/branch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 시도 → 시군구 2단계 select. 최종 선택된 regions.id를 onChange로 넘긴다. */
export function RegionSelect({
  regions,
  value,
  onChange,
}: {
  regions: RegionRow[];
  value: string | null;
  onChange: (regionId: string | null) => void;
}) {
  const selectedRegion = regions.find((r) => r.id === value);
  const [sidoCode, setSidoCode] = useState<string>(selectedRegion?.sido_code ?? '');

  const sidoList = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of regions) {
      if (!seen.has(r.sido_code)) seen.set(r.sido_code, r.sido_name);
    }
    return Array.from(seen.entries());
  }, [regions]);

  const sigunguList = useMemo(
    () => regions.filter((r) => r.sido_code === sidoCode && r.sigungu_code),
    [regions, sidoCode]
  );

  const sidoOnlyRegion = useMemo(
    () => regions.find((r) => r.sido_code === sidoCode && !r.sigungu_code),
    [regions, sidoCode]
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>시/도</Label>
        <Select
          value={sidoCode}
          onValueChange={(value) => {
            setSidoCode(value);
            const onlyRegion = regions.find((r) => r.sido_code === value && !r.sigungu_code);
            onChange(onlyRegion ? onlyRegion.id : null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="선택" />
          </SelectTrigger>
          <SelectContent>
            {sidoList.map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>시/군/구</Label>
        <Select
          value={value ?? undefined}
          onValueChange={(next) => onChange(next)}
          disabled={sigunguList.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={sidoOnlyRegion ? '해당 없음' : '선택'} />
          </SelectTrigger>
          <SelectContent>
            {sigunguList.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.sigungu_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
