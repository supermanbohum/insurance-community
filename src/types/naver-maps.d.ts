/**
 * 네이버 지도 SDK는 공식 @types 패키지가 없어, 이 프로젝트에서 실제로 쓰는 API
 * 표면만 최소한으로 선언한다. 전역 스크립트 태그로 로드되는 `naver.maps.*`를
 * 타입 체크에서 인식시키기 위한 앰비언트 선언 - 별도 import 없이 프로젝트
 * 어디서든 `naver.maps.Map` 같은 타입을 바로 쓸 수 있다.
 */
declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }
  class Size {
    constructor(width: number, height: number);
  }
  class Point {
    constructor(x: number, y: number);
  }
  interface LatLngBounds {
    hasLatLng(latlng: LatLng): boolean;
    getCenter(): LatLng;
    north(): number;
    south(): number;
    east(): number;
    west(): number;
  }
  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    zoomControl?: boolean;
    zoomControlOptions?: { position: number };
    minZoom?: number;
    maxZoom?: number;
  }
  class Map {
    constructor(el: HTMLElement, options?: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    getZoom(): number;
    setZoom(zoom: number, animate?: boolean): void;
    getBounds(): LatLngBounds;
    morph(coord: LatLng, zoom?: number, options?: { duration?: number }): void;
    destroy(): void;
  }
  interface MarkerIcon {
    content: string;
    size?: Size;
    anchor?: Point;
  }
  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    icon?: MarkerIcon;
    zIndex?: number;
  }
  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    setIcon(icon: MarkerIcon): void;
    setZIndex(zIndex: number): void;
    getElement(): HTMLElement;
    setPosition(latlng: LatLng): void;
  }
  const Position: { BOTTOM_RIGHT: number };
  const Event: {
    addListener: (target: unknown, eventName: string, handler: (...args: unknown[]) => void) => unknown;
    removeListener: (listener: unknown) => void;
  };
}

/** 벤더링한 marker-clustering/src/MarkerClustering.js가 등록하는 전역 클래스. */
declare class MarkerClustering {
  constructor(options: {
    map: naver.maps.Map;
    markers: naver.maps.Marker[];
    disableClickZoom?: boolean;
    minClusterSize?: number;
    maxZoom?: number;
    gridSize?: number;
    icons: naver.maps.MarkerIcon[];
    indexGenerator: number[];
    stylingFunction?: (clusterMarker: naver.maps.Marker, count: number) => void;
  });
  setMarkers(markers: naver.maps.Marker[]): void;
  setMap(map: naver.maps.Map | null): void;
}

interface Window {
  naver?: typeof naver;
}
