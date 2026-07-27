'use client';

import type { GaFilterOption } from '@/lib/public/ga-directory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 보험맵은 GA를 새로 만드는 사이트가 아니라 지점을 찾는 플랫폼이다 - 파트너는
 * 이미 정해진 GA 목록(전국 GA 마스터 목록) 중에서 소속 GA를 고르기만 한다. */
export function GaSelect({
  options,
  value,
  onChange,
}: {
  options: GaFilterOption[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="소속 GA를 선택하세요" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((ga) => (
          <SelectItem key={ga.id} value={ga.name}>
            {ga.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
