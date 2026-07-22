'use server';

import { requireAdmin } from '@/lib/admin/session';
import { geocodeAddress } from '@/lib/geo/geocode';

/** 주소검색(Daum Postcode) 결과 주소를 위도/경도로 변환한다. 키 미설정/실패 시 null. */
export async function geocodeAddressAction(address: string): Promise<{ lat: number; lng: number } | null> {
  await requireAdmin();
  return geocodeAddress(address);
}
