'use server';

import { getCurrentAdmin } from '@/lib/admin/session';
import { getCurrentPartner } from '@/lib/partner/session';
import { geocodeAddress } from '@/lib/geo/geocode';

/**
 * 주소검색(Daum Postcode) 결과 주소를 위도/경도로 변환한다. 키 미설정/실패 시 null.
 * 관리자 지점 편집 화면과 파트너 등록/지점 편집 화면이 같은 AddressSearchField를
 * 공유하므로, 둘 중 하나의 세션만 있으면 통과시킨다 - redirect()가 아니라 일반
 * 에러를 던져야 한다(과거 requireAdmin()을 쓸 때는 파트너가 호출하면 세션이
 * 없다고 판단해 /admin/login으로 강제 리다이렉트되는 버그가 있었다).
 */
export async function geocodeAddressAction(address: string): Promise<{ lat: number; lng: number } | null> {
  const [admin, partner] = await Promise.all([getCurrentAdmin(), getCurrentPartner()]);
  if (!admin && !partner) {
    throw new Error('NOT_AUTHORIZED');
  }
  return geocodeAddress(address);
}
