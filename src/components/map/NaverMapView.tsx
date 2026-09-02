'use client';

import { useEffect, useRef, useState } from 'react';
import { loadNaverMapsSdk } from '@/lib/naver-maps/loadNaverMapsSdk';
import type { MapBoundsLike, MapControllerLike } from './mapController';
import type { MapBranch } from './types';
import type { ExternalPoi } from '@/lib/public/external-poi.supabase';

const DEFAULT_CENTER: [number, number] = [36.4, 127.9];
const DEFAULT_ZOOM = 7;
export const FLY_DURATION_MS = 900;

// 기본 물방울 핀 대신 보험맵 로고(방패+체크)를 담은 원형 배지 - Leaflet 버전과
// 완전히 동일한 SVG를 그대로 이식해 지도 엔진이 바뀌어도 브랜드 마커는 똑같이 보인다.
function pinIconHtml(operationType: 'direct' | 'branch', active: boolean, hasPlannerBadge: boolean) {
  const color = operationType === 'direct' ? '#e0a319' : '#2f6bff';
  const w = active ? 38 : 30;
  const h = Math.round((w * 40) / 32);
  const filter = active
    ? `drop-shadow(0 4px 8px rgba(15,23,42,0.45)) drop-shadow(0 0 0 4px ${color}2e)`
    : 'drop-shadow(0 2px 5px rgba(15,23,42,0.35))';
  // 고소득 설계사가 있는 지점은 핀 우상단에 작은 골드 별 배지를 얹는다 - 지도 필터
  // (plannerBadgeTotal>0)와 시각적으로 대응되도록, 배지 색은 상세페이지의 tier 배지와
  // 동일한 골드 계열(#eab308)을 사용한다.
  const badge = hasPlannerBadge
    ? `<circle cx="25.5" cy="7.5" r="6" fill="#eab308" stroke="#fff" stroke-width="1.5"/>
       <path d="M25.5 4.2l1.1 2.23 2.46.36-1.78 1.73.42 2.45-2.2-1.16-2.2 1.16.42-2.45-1.78-1.73 2.46-.36z" fill="#fff"/>`
    : '';
  // Naver 마커의 size+anchor가 위치 정렬을 전담한다(Leaflet의 iconSize/iconAnchor와
  // 동일한 역할) - content 안에 CSS transform으로 또 옮기면 이중 오프셋이 생긴다.
  return {
    html: `
      <svg width="${w}" height="${h}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:${filter};">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="16" r="10.5" fill="#fff"/>
        <path d="M16 8.7L21 10.8V15.6C21 19 18.85 21.65 16 23.1C13.15 21.65 11 19 11 15.6V10.8Z" fill="${color}"/>
        <path d="M12.9 16.2L15.15 18.45L19.2 13.5" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        ${badge}
      </svg>`,
    w,
    h,
  };
}

const CLUSTER_TIERS = [36, 42, 48, 54];

/** 클러스터는 이제 "미등록(외부 수집) 지점" 전용이다 - 등록 지점은 클러스터에 넣지
 * 않고 항상 개별 핀으로 최상위에 그린다(SPEC-037). 지금 등록 지점이 0개고 미등록이
 * 수천 개가 될 예정이라, 섞으면 등록 1개가 수천 개에 묻힌다.
 *
 * 🔴 그래서 클러스터 원은 브랜드색이 아니라 회색이다. 브랜드색을 쓰면 우리가 수집만
 * 해온 곳이 우리 지점처럼 보인다. */
function clusterIconHtml(size: number) {
  return `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:#98A2B3;color:#fff;font-weight:800;font-size:${Math.round(size * 0.34)}px;
      box-shadow:0 2px 6px rgba(15,23,42,0.2);
      border:2px solid #fff;
    "><span class="cluster-count"></span></div>`;
}

/** 미등록 지점 마커 - 회색 무광 도트. 핀(등록)과 형태부터 다른 이유는 색만 다르면
 * "등급 차"로 읽히기 때문이다(SPEC-037). 테두리·그림자·라벨이 전부 없다 -
 * 🔴 특히 라벨(상호)은 어느 줌에서도 띄우지 않는다. 우리가 검증하지 않은 실존 상호를
 * 지도 위에 글자로 박아두면 그 자체가 오용이 된다. */
const EXTERNAL_DOT_SIZE = 20;

function externalDotHtml() {
  return `
    <div style="
      width:${EXTERNAL_DOT_SIZE}px;height:${EXTERNAL_DOT_SIZE}px;border-radius:9999px;
      background:#98A2B3;opacity:0.85;
    "></div>`;
}

function myLocationHtml() {
  return `
    <div style="position:relative;width:18px;height:18px;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:#2f6bff;opacity:0.25;animation:bohommap-pulse 1.8s ease-out infinite;"></span>
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:9999px;background:#2f6bff;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,0.4);"></span>
    </div>
    <style>@keyframes bohommap-pulse{0%{transform:scale(0.6);opacity:0.5;}100%{transform:scale(2.2);opacity:0;}}</style>`;
}

// PC 전용 확대/축소 슬라이더 노출 기준 - 지도 페이지의 데스크톱 사이드바/모바일
// 하단시트 전환과 동일한 lg 브레이크포인트(1024px)를 그대로 쓴다. 모바일(App
// WebView 포함)에서는 슬라이더가 화면(특히 하단 시트)을 가리는 문제가 있어 완전히
// 숨기고, 대신 원래부터 기본 제스처인 두 손가락 핀치 확대/한 손가락 드래그 이동을
// 그대로 쓰게 한다 - 이 둘은 zoomControl과 무관하게 Naver 지도의 기본 동작이라
// 슬라이더를 꺼도 계속 작동한다. PC는 마우스 휠 확대(기본 동작, 별도 설정 불필요)를
// 유지하면서 슬라이더만 화면을 가리지 않는 우측 하단에 둔다.
function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

function toBoundsLike(bounds: naver.maps.LatLngBounds): MapBoundsLike {
  const center = bounds.getCenter();
  return {
    contains: (lat, lng) => bounds.hasLatLng(new window.naver!.maps.LatLng(lat, lng)),
    south: bounds.south(),
    north: bounds.north(),
    east: bounds.east(),
    west: bounds.west(),
    center: { lat: center.lat(), lng: center.lng() },
  };
}

export function NaverMapView({
  branches,
  externalPois = [],
  selectedId,
  onSelect,
  onSelectExternal,
  onBoundsChanged,
  flyToTarget,
  onMapReady,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  myLocation,
  showZoomControl = true,
}: {
  branches: MapBranch[];
  /** ⑪ 아직 등록되지 않은(외부 수집) 지점 - 회색 도트로만 그리고 클러스터에 넣는다. */
  externalPois?: ExternalPoi[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectExternal?: (id: string) => void;
  onBoundsChanged: (bounds: MapBoundsLike, userInitiated: boolean) => void;
  flyToTarget: { id: string; token: number } | null;
  onMapReady?: (controller: MapControllerLike) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  /** 사용자의 현재 위치 - 있으면 지도 위에 별도 점 마커로 표시한다(Leaflet 버전엔 없던
   * 기능으로 이번에 추가). */
  myLocation?: { lat: number; lng: number } | null;
  /** 🔴 확대/축소 슬라이더 노출(기본 켬 = /map 의 기존 동작 그대로).
   *  홈에 끼워 넣은 작은 지도에서는 끈다 — 지도 면적이 작아 슬라이더가 화면을 잡아먹는다
   *  (오너 2026-08-27: 「저 막대가 너무 거슬려」). 꺼도 **휠·핀치 확대와 드래그 이동은
   *  네이버 지도 기본 동작이라 그대로 작동한다** — 조작을 뺏는 게 아니라 막대만 감춘다. */
  showZoomControl?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const clusterRef = useRef<MarkerClustering | null>(null);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const myLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const userMovedRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const zoomControlResizeHandlerRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    loadNaverMapsSdk()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const naverNs = window.naver!;
        const map = new naverNs.maps.Map(containerRef.current, {
          center: new naverNs.maps.LatLng(initialCenter[0], initialCenter[1]),
          zoom: initialZoom,
          zoomControl: showZoomControl && isDesktopViewport(),
          zoomControlOptions: { position: naverNs.maps.Position.BOTTOM_RIGHT },
        });
        mapRef.current = map;

        // 브라우저 창 크기 변경(반응형 리사이즈)이나 모바일 회전으로 lg 기준을
        // 넘나들 때마다 슬라이더 노출 여부를 다시 맞춘다 - 그렇지 않으면 처음 로드
        // 시점의 화면 폭 기준으로 고정돼버려, PC↔모바일 전환 시 슬라이더가 없어야
        // 할 화면에 남아있거나 있어야 할 화면에서 사라지는 문제가 생긴다.
        const handleViewportChange = () => {
          map.setOptions('zoomControl', showZoomControl && isDesktopViewport());
        };
        window.addEventListener('resize', handleViewportChange);
        zoomControlResizeHandlerRef.current = handleViewportChange;

        const cluster = new MarkerClustering({
          map,
          markers: [],
          disableClickZoom: false,
          minClusterSize: 2,
          maxZoom: 13,
          gridSize: 100,
          icons: CLUSTER_TIERS.map((size) => ({
            content: clusterIconHtml(size),
            size: new naverNs.maps.Size(size, size),
            anchor: new naverNs.maps.Point(size / 2, size / 2),
          })),
          indexGenerator: [10, 30, 50],
          stylingFunction: (clusterMarker, count) => {
            const el = clusterMarker.getElement();
            const countEl = el?.querySelector<HTMLElement>('.cluster-count');
            if (countEl) countEl.textContent = String(count);
          },
        });
        clusterRef.current = cluster;

        naverNs.maps.Event.addListener(map, 'dragstart', () => {
          userMovedRef.current = true;
        });
        naverNs.maps.Event.addListener(map, 'zoomstart', () => {
          userMovedRef.current = true;
        });
        naverNs.maps.Event.addListener(map, 'idle', () => {
          const userInitiated = userMovedRef.current && !programmaticMoveRef.current;
          onBoundsChanged(toBoundsLike(map.getBounds()), userInitiated);
          userMovedRef.current = false;
          programmaticMoveRef.current = false;
        });

        setStatus('ready');
        onMapReady?.({
          flyTo: (lat, lng, zoom) => {
            programmaticMoveRef.current = true;
            map.morph(new naverNs.maps.LatLng(lat, lng), zoom, { duration: FLY_DURATION_MS / 1000 });
          },
          getZoom: () => map.getZoom(),
          getBounds: () => toBoundsLike(map.getBounds()),
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (zoomControlResizeHandlerRef.current) {
        window.removeEventListener('resize', zoomControlResizeHandlerRef.current);
        zoomControlResizeHandlerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 갱신 - 등록/미등록을 서로 다른 경로로 그린다(SPEC-037).
  //
  //   등록(branches)      map에 직접 붙인다. 클러스터에 넣지 않는다.
  //   미등록(externalPois) 클러스터에만 넣는다.
  //
  // 🔴 등록을 클러스터에서 뺀 것이 이 변경의 핵심이다. 예전엔 둘 다 클러스터에 넣었는데,
  // 미등록이 수천 개가 될 예정이라 그대로 두면 등록 지점 1개가 회색 클러스터 원 안으로
  // 흡수돼 화면에서 사라진다. 등록은 항상 개별 핀으로, 항상 클러스터 위에 있어야 한다.
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    const naverNs = window.naver;
    if (!map || !cluster || !naverNs) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    branches.forEach((b) => {
      if (b.lat == null || b.lng == null) return;
      const active = b.id === selectedId;
      const { html, w, h } = pinIconHtml(b.operationType, active, b.plannerBadgeTotal > 0);
      const marker = new naverNs.maps.Marker({
        position: new naverNs.maps.LatLng(b.lat, b.lng),
        icon: { content: html, size: new naverNs.maps.Size(w, h), anchor: new naverNs.maps.Point(w / 2, h) },
        // 클러스터 원(및 회색 도트)보다 항상 위. 같은 좌표에 겹쳐도 등록이 위에 온다.
        zIndex: active ? 100000 : 10000,
        map,
      });
      naverNs.maps.Event.addListener(marker, 'click', () => onSelect(b.id));
      markersRef.current.set(b.id, marker);
    });

    const externalMarkers: naver.maps.Marker[] = [];
    externalPois.forEach((poi) => {
      const marker = new naverNs.maps.Marker({
        position: new naverNs.maps.LatLng(poi.lat, poi.lng),
        icon: {
          content: externalDotHtml(),
          size: new naverNs.maps.Size(EXTERNAL_DOT_SIZE, EXTERNAL_DOT_SIZE),
          // 도트는 핀과 달리 좌표가 원의 중심이다(핀은 뾰족한 끝이 좌표).
          anchor: new naverNs.maps.Point(EXTERNAL_DOT_SIZE / 2, EXTERNAL_DOT_SIZE / 2),
        },
        zIndex: 0,
      });
      if (onSelectExternal) {
        naverNs.maps.Event.addListener(marker, 'click', () => onSelectExternal(poi.id));
      }
      markersRef.current.set(`external:${poi.id}`, marker);
      externalMarkers.push(marker);
    });
    cluster.setMarkers(externalMarkers);
    // 벤더링한 MarkerClustering.js는 옵션 키가 markers(복수)인데 changed() 핸들러의
    // switch는 marker(단수)만 매칭해서, setMarkers()만으로는 재렌더링이 트리거되지
    // 않는다(다음 지도 idle 이벤트까지 마커가 화면에 전혀 나타나지 않음). setMap을
    // 껐다 켜서 onRemove→onAdd 라이프사이클을 강제로 다시 태워 즉시 반영한다.
    cluster.setMap(null);
    cluster.setMap(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, externalPois, selectedId, status]);

  // 현재 위치 마커.
  useEffect(() => {
    const map = mapRef.current;
    const naverNs = window.naver;
    if (!map || !naverNs) return;

    if (!myLocation) {
      myLocationMarkerRef.current?.setMap(null);
      myLocationMarkerRef.current = null;
      return;
    }

    const position = new naverNs.maps.LatLng(myLocation.lat, myLocation.lng);
    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.setPosition(position);
    } else {
      myLocationMarkerRef.current = new naverNs.maps.Marker({
        position,
        map,
        icon: { content: myLocationHtml(), size: new naverNs.maps.Size(18, 18), anchor: new naverNs.maps.Point(9, 9) },
        zIndex: 2000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLocation, status]);

  // 리스트/검색에서 특정 지점을 골랐을 때 그 위치로 부드럽게 이동.
  useEffect(() => {
    if (!flyToTarget) return;
    const target = branches.find((b) => b.id === flyToTarget.id);
    const map = mapRef.current;
    const naverNs = window.naver;
    if (!target || target.lat == null || target.lng == null || !map || !naverNs) return;
    programmaticMoveRef.current = true;
    map.morph(new naverNs.maps.LatLng(target.lat, target.lng), Math.max(map.getZoom(), 13), {
      duration: FLY_DURATION_MS / 1000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget]);

  if (status === 'error') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-sunken px-6 text-center text-sm text-ink-faint">
        지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-sunken text-sm text-ink-faint">
          지도를 불러오는 중…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
