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
  /** null = 수집되지 않음. 화면에서 「연락처 기재 안 함」으로 표시한다. */
  phone: string | null;
  lat: number;
  lng: number;
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
      .select('id, name, address, road_address, phone, lat, lng')
      .gte('lat', bounds.minLat)
      .lte('lat', bounds.maxLat)
      .gte('lng', bounds.minLng)
      .lte('lng', bounds.maxLng)
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string | null) ?? null,
      roadAddress: (row.road_address as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      lat: row.lat as number,
      lng: row.lng as number,
    }));
  } catch {
    // 마이그레이션 미적용 등 - 미등록 지점만 안 보이고 지도 자체는 정상 동작한다.
    return [];
  }
}
