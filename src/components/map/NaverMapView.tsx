'use client';

import { useEffect, useRef, useState } from 'react';
import { loadNaverMapsSdk } from '@/lib/naver-maps/loadNaverMapsSdk';
import type { MapBoundsLike, MapControllerLike } from './mapController';
import type { MapBranch } from './types';

const DEFAULT_CENTER: [number, number] = [36.4, 127.9];
const DEFAULT_ZOOM = 7;
export const FLY_DURATION_MS = 900;

// 기본 물방울 핀 대신 보험맵 로고(방패+체크)를 담은 원형 배지 - Leaflet 버전과
// 완전히 동일한 SVG를 그대로 이식해 지도 엔진이 바뀌어도 브랜드 마커는 똑같이 보인다.
function pinIconHtml(operationType: 'direct' | 'branch', active: boolean) {
  const color = operationType === 'direct' ? '#e0a319' : '#2f6bff';
  const w = active ? 38 : 30;
  const h = Math.round((w * 40) / 32);
  const filter = active
    ? `drop-shadow(0 4px 8px rgba(15,23,42,0.45)) drop-shadow(0 0 0 4px ${color}2e)`
    : 'drop-shadow(0 2px 5px rgba(15,23,42,0.35))';
  // Naver 마커의 size+anchor가 위치 정렬을 전담한다(Leaflet의 iconSize/iconAnchor와
  // 동일한 역할) - content 안에 CSS transform으로 또 옮기면 이중 오프셋이 생긴다.
  return {
    html: `
      <svg width="${w}" height="${h}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:${filter};">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="16" r="10.5" fill="#fff"/>
        <path d="M16 8.7L21 10.8V15.6C21 19 18.85 21.65 16 23.1C13.15 21.65 11 19 11 15.6V10.8Z" fill="${color}"/>
        <path d="M12.9 16.2L15.15 18.45L19.2 13.5" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`,
    w,
    h,
  };
}

const CLUSTER_TIERS = [36, 42, 48, 54];

function clusterIconHtml(size: number) {
  return `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:#2f6bff;color:#fff;font-weight:800;font-size:${Math.round(size * 0.34)}px;
      box-shadow:0 3px 10px rgba(47,107,255,0.45),0 0 0 4px rgba(47,107,255,0.16);
      border:2.5px solid #fff;
    "><span class="cluster-count"></span></div>`;
}

function myLocationHtml() {
  return `
    <div style="position:relative;width:18px;height:18px;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:#2f6bff;opacity:0.25;animation:bohommap-pulse 1.8s ease-out infinite;"></span>
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:9999px;background:#2f6bff;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,0.4);"></span>
    </div>
    <style>@keyframes bohommap-pulse{0%{transform:scale(0.6);opacity:0.5;}100%{transform:scale(2.2);opacity:0;}}</style>`;
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
  selectedId,
  onSelect,
  onBoundsChanged,
  flyToTarget,
  onMapReady,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  myLocation,
}: {
  branches: MapBranch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChanged: (bounds: MapBoundsLike, userInitiated: boolean) => void;
  flyToTarget: { id: string; token: number } | null;
  onMapReady?: (controller: MapControllerLike) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  /** 사용자의 현재 위치 - 있으면 지도 위에 별도 점 마커로 표시한다(Leaflet 버전엔 없던
   * 기능으로 이번에 추가). */
  myLocation?: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const clusterRef = useRef<MarkerClustering | null>(null);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const myLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const userMovedRef = useRef(false);
  const programmaticMoveRef = useRef(false);
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
          zoomControl: true,
          zoomControlOptions: { position: naverNs.maps.Position.BOTTOM_RIGHT },
        });
        mapRef.current = map;

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 갱신 - branches/selectedId가 바뀔 때마다 클러스터를 통째로 다시 구성한다
  // (Leaflet 버전과 동일하게 diff 없이 전체 재생성 - 지점 수가 수천 단위가 아니면 충분히 빠르다).
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    const naverNs = window.naver;
    if (!map || !cluster || !naverNs) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const markers: naver.maps.Marker[] = [];
    branches.forEach((b) => {
      if (b.lat == null || b.lng == null) return;
      const active = b.id === selectedId;
      const { html, w, h } = pinIconHtml(b.operationType, active);
      const marker = new naverNs.maps.Marker({
        position: new naverNs.maps.LatLng(b.lat, b.lng),
        icon: { content: html, size: new naverNs.maps.Size(w, h), anchor: new naverNs.maps.Point(w / 2, h) },
        zIndex: active ? 1000 : 0,
      });
      naverNs.maps.Event.addListener(marker, 'click', () => onSelect(b.id));
      markersRef.current.set(b.id, marker);
      markers.push(marker);
    });
    cluster.setMarkers(markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, selectedId, status]);

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
