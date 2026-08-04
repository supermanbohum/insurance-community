'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface PlannerMarketConsents {
  contactPaidView: boolean;
  recruitContact: boolean;
  privacyPolicy: boolean;
  thirdPartyShare: boolean;
  withdrawalNotice: boolean;
}

const CONSENT_ITEMS: { key: keyof PlannerMarketConsents; label: string }[] = [
  { key: 'contactPaidView', label: '본인의 연락처가 보험맵 제휴 GA에게 유료로 열람될 수 있음에 동의합니다.' },
  { key: 'recruitContact', label: '채용 목적의 연락을 받을 수 있음에 동의합니다.' },
  { key: 'privacyPolicy', label: '개인정보 처리방침에 동의합니다.' },
  { key: 'thirdPartyShare', label: '개인정보 제3자 제공에 동의합니다.' },
  { key: 'withdrawalNotice', label: '언제든 공개를 철회할 수 있음을 확인했습니다.' },
];

/** 설계사 등록 시 필수 동의 5종 - 코드베이스 최초의 동의 체크박스 패턴. 하나라도
 * 체크 안 하면 등록 자체가 막힌다(제출 버튼 disabled + 서버 RPC의 CONSENT_REQUIRED). */
export function PlannerMarketConsentCheckboxes({
  consents,
  onChange,
}: {
  consents: PlannerMarketConsents;
  onChange: (next: PlannerMarketConsents) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {CONSENT_ITEMS.map((item) => (
        <label key={item.key} className="flex items-start gap-2.5 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={consents[item.key]}
            onCheckedChange={(checked) => onChange({ ...consents, [item.key]: checked === true })}
          />
          <Label className="cursor-pointer font-normal leading-snug">{item.label}</Label>
        </label>
      ))}
    </div>
  );
}

export const EMPTY_CONSENTS: PlannerMarketConsents = {
  contactPaidView: false,
  recruitContact: false,
  privacyPolicy: false,
  thirdPartyShare: false,
  withdrawalNotice: false,
};
