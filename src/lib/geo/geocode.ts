import 'server-only';

/**
 * 도로명주소 → 위도/경도 지오코딩. Kakao Local API(GET /v2/local/search/address.json)를
 * 이 함수 뒤에 격리해두었다 - 다른 지오코딩 제공자로 바꾸더라도 호출부(actions/geo.ts)는
 * 그대로 두고 이 파일 내부만 교체하면 된다.
 *
 * KAKAO_REST_API_KEY가 설정되지 않았거나 API 호출이 실패하면 에러를 던지지 않고
 * null을 반환한다 - 주소/우편번호는 정상 저장되고 위도/경도만 비어, 지도 섹션이
 * 자동으로 숨겨지는 형태로 우아하게 저하된다.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey || !address.trim()) return null;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data: { documents?: { x: string; y: string }[] } = await res.json();
    const first = data.documents?.[0];
    if (!first) return null;

    const lng = Number(first.x);
    const lat = Number(first.y);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}
