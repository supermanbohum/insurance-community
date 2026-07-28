/**
 * 지도 라이브러리(과거 Leaflet, 지금 네이버 지도)에 종속되지 않는 얇은 인터페이스.
 * MapPageClient.tsx는 이 타입만 알고, 실제 구현(NaverMapView)이 라이브러리별 API를
 * 이 모양으로 감싼다 - 나중에 지도 엔진을 또 바꾸더라도 이 파일 밖은 손댈 필요가 없다.
 */
export interface MapBoundsLike {
  contains: (lat: number, lng: number) => boolean;
  south: number;
  north: number;
  east: number;
  west: number;
  center: { lat: number; lng: number };
}

export interface MapControllerLike {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  getZoom: () => number;
  getBounds: () => MapBoundsLike;
}
