import { NextResponse } from 'next/server';
import { createBranchAction } from '@/lib/actions/branch-admin';
import { geocodeAddress } from '@/lib/geo/geocode';

export const dynamic = 'force-dynamic';

const TEST_GA_COMPANY_ID = 'd3058023-0c89-4a64-8e90-901d31210761';
const SEOUL_GANGNAM_REGION_ID = 'edfb4339-12ff-4d35-b382-7d4b0d15ea34';
const TEST_ADDRESS = '서울특별시 강남구 테헤란로 427';

/**
 * AddressSearchField의 실제 동작(Daum 주소 선택 -> geocodeAddressAction 호출 -> lat/lng 포함해
 * createBranchAction 호출)을 그대로 재현해 좌표 저장까지 실제로 되는지 검증하는 임시 진단 엔드포인트.
 * Daum Postcode 팝업 자체는 자동화 브라우저의 팝업 차단으로 직접 열 수 없어 이 경로로 우회 검증한다.
 */
export async function GET() {
  const coords = await geocodeAddress(TEST_ADDRESS);

  if (!coords) {
    return NextResponse.json({ ok: false, error: 'geocode failed', coords: null });
  }

  const result = await createBranchAction(TEST_GA_COMPANY_ID, {
    name: '지도테스트지점',
    regionId: SEOUL_GANGNAM_REGION_ID,
    address: TEST_ADDRESS,
    lat: coords.lat,
    lng: coords.lng,
  });

  return NextResponse.json({ ok: true, coords, createResult: result });
}
