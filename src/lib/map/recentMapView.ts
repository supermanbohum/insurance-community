const KEY = 'boheommap:last_map_view';

export interface RecentMapView {
  lat: number;
  lng: number;
  zoom: number;
}

/** 지도 최초 화면을 "전국"이 아니라 마지막으로 보던 지역에서 시작하기 위해 저장한다. */
export function saveRecentMapView(view: RecentMapView) {
  try {
    localStorage.setItem(KEY, JSON.stringify(view));
  } catch {
    // 프라이빗 브라우징 등으로 localStorage를 못 쓰면 조용히 무시.
  }
}

export function getRecentMapView(): RecentMapView | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecentMapView>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number' || typeof parsed.zoom !== 'number') return null;
    return { lat: parsed.lat, lng: parsed.lng, zoom: parsed.zoom };
  } catch {
    return null;
  }
}
