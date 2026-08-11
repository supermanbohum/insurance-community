import { createPublicSupabaseClient } from '@/lib/supabase/public';

/**
 * ⑪ 지도에 함께 표시되는 "아직 등록되지 않은 지점"(map_external_pois, 0095).
 *
 * 🔴 이 파일은 지도만 쓴다. 홈·검색·GA찾기·랭킹·우수GA 점수는 이 데이터를 절대
 * 읽지 않는다(REDESIGN §⑪) - 우리가 검증하지 않은 외부 사실이라 집계에 섞이면
 * "등록 지점 수"의 의미가 무너진다.
 *
 * 🔴 수집한 사실만 내보낸다. 소개글·설계사 수·평점은 테이블에 컬럼조차 없으므로
 * 여기서 만들어낼 수도 없다. phone은 수집 안 됐으면 null 그대로 넘긴다 - 화면이
 * "연락처 기재 안 함"을 표시할지 결정하려면 빈 문자열이 아니라 null이어야 한다.
 */
export interface ExternalPoi {
  id: string;
  name: string;
  address: string | null;
  roadAddress: string | null;
  /** null = 수집되지 않음. 화면에서 「공개된 연락처 없음」으로 표시한다(콘텐츠 확정본
   * - 「연락처 기재 안 함」은 행위 주어가 지점으로 읽혀 미세 폄하가 남는다). */
  phone: string | null;
  /** null이면 [네이버 지도에서 보기] CTA를 아예 렌더하지 않는다(0096). 없는 링크를
   * 버튼으로 만들지 않아 "눌렀는데 없더라"가 구조적으로 불가능하다. */
  placeUrl: string | null;
  /** 출처 표기 문구를 소스별로 다르게 쓰기 위해 그대로 내보낸다(sourceLabel 참고). */
  source: string;
  lat: number;
  lng: number;
}

/** 출처 표기 - 수집 경로에 따라 문구가 달라진다(콘텐츠 확정).
 * API로 받은 데이터를 "지도에 공개된 정보"라고 쓰면 출처를 잘못 말하는 것이 된다.
 *
 * ⚠️ 네이버 오픈API를 채택하면 이용약관이 표기 문구·위치를 지정하고 있을 수 있고,
 * 그 경우 약관 규정이 이 문구보다 우선한다(콘텐츠 확인). 채택 확정 시 약관 확인 후 교체. */
export function sourceLabel(source: string): string {
  if (source === 'naver_local_api') return '네이버 지역검색';
  return '네이버 지도에 공개된 정보';
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** 지도 영역 안의 미등록 지점만 조회한다 - 전국을 한 번에 내려주지 않는다.
 *
 * 0095가 아직 적용되지 않은 배포에서도 지도가 통째로 죽으면 안 되므로 실패 시
 * 빈 배열로 폴백한다(오늘 pro_until에서 같은 실수를 실제로 재현해봤다 - 없는
 * 테이블/컬럼을 조회하면 페이지 전체가 오류 화면이 된다). */
export async function listExternalPoisInBounds(bounds: MapBounds, limit = 500): Promise<ExternalPoi[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from('map_external_pois')
      .select('id, source, name, address, road_address, phone, place_url, lat, lng')
      .gte('lat', bounds.minLat)
      .lte('lat', bounds.maxLat)
      .gte('lng', bounds.minLng)
      .lte('lng', bounds.maxLng)
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      source: row.source as string,
      name: row.name as string,
      address: (row.address as string | null) ?? null,
      roadAddress: (row.road_address as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      placeUrl: (row.place_url as string | null) ?? null,
      lat: row.lat as number,
      lng: row.lng as number,
    }));
  } catch {
    // 마이그레이션 미적용 등 - 미등록 지점만 안 보이고 지도 자체는 정상 동작한다.
    return [];
  }
}
