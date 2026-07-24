'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { geocodeAddressAction } from '@/lib/actions/geo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DaumPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void };
    };
  }
}

export interface AddressValue {
  address: string;
  addressDetail: string;
  zonecode: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Daum 우편번호 서비스로 기본주소/우편번호를 채우고, 선택된 주소를 Kakao Local API로
 * 지오코딩해 위도/경도까지 자동 저장한다. 관리자는 상세주소만 직접 입력한다.
 */
export function AddressSearchField({
  value,
  onChange,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const openPostcode = useCallback(() => {
    if (!window.daum?.Postcode) {
      toast.error('주소 검색 스크립트를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const nextAddress = data.roadAddress || data.jibunAddress;
        onChange({ ...valueRef.current, address: nextAddress, zonecode: data.zonecode, lat: null, lng: null });
        setGeocoding(true);
        geocodeAddressAction(nextAddress)
          .then((coords) => {
            onChange({ ...valueRef.current, address: nextAddress, zonecode: data.zonecode, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
            if (!coords) toast.info('좌표를 자동으로 찾지 못했습니다. 주소/우편번호는 저장되며, 지도는 표시되지 않습니다.');
          })
          .finally(() => setGeocoding(false));
      },
    }).open();
  }, [onChange]);

  return (
    <div className="flex flex-col gap-3">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} />

      <div className="flex flex-col gap-1.5">
        <Label>주소 검색</Label>
        <div className="flex gap-2">
          <Input value={value.address} readOnly placeholder="① 주소 검색 버튼을 눌러 도로명주소를 불러오세요" className="flex-1 bg-muted" />
          <Button type="button" variant="outline" onClick={openPostcode} disabled={!scriptReady}>
            <Search className="mr-1.5 h-3.5 w-3.5" />
            주소 검색
          </Button>
        </div>
        {value.zonecode && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            우편번호 {value.zonecode}
            {geocoding && (
              <span className="ml-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                좌표 확인 중...
              </span>
            )}
            {!geocoding && value.lat != null && value.lng != null && (
              <span className="ml-1 text-brand-600">위도/경도 자동 저장됨</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address-detail">② 상세주소 입력</Label>
        <Input
          id="address-detail"
          value={value.addressDetail}
          onChange={(e) => onChange({ ...value, addressDetail: e.target.value })}
          placeholder="예: 3층, 301호, A동 1204호"
          disabled={!value.address}
        />
      </div>
    </div>
  );
}
