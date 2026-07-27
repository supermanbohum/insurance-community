'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { MapBranch } from './types';

const DEFAULT_CENTER: [number, number] = [36.4, 127.9];
const DEFAULT_ZOOM = 7;

function createPinIcon(operationType: 'direct' | 'branch', active: boolean) {
  const color = operationType === 'direct' ? '#e0a319' : '#2f6bff';
  const size = active ? 38 : 28;
  const ring = active ? `0 0 0 5px ${color}33, 0 4px 10px rgba(15,23,42,0.4)` : '0 2px 6px rgba(15,23,42,0.35)';
  return L.divIcon({
    className: 'bohommap-pin',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:${ring};
      border:2.5px solid #fff;
      transition:width .15s ease,height .15s ease;
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

/** 네이버부동산 스타일의 숫자 클러스터 - 기본 Leaflet 클러스터의 붉은/노란 링 대신 브랜드 컬러 원형 배지. */
function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 50 ? 52 : count >= 10 ? 44 : 38;
  const fontSize = count >= 50 ? 15 : count >= 10 ? 14 : 13;
  return L.divIcon({
    className: 'bohommap-cluster',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:#2f6bff;color:#fff;font-weight:800;font-size:${fontSize}px;
      box-shadow:0 3px 10px rgba(47,107,255,0.45),0 0 0 4px rgba(47,107,255,0.16);
      border:2.5px solid #fff;
    ">${count}</div>`,
    iconSize: [size, size],
  });
}

export function LeafletMapView({
  branches,
  selectedId,
  onSelect,
  onBoundsChanged,
  flyToTarget,
  onMapReady,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
}: {
  branches: MapBranch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChanged: (bounds: L.LatLngBounds, userInitiated: boolean) => void;
  flyToTarget: { id: string; token: number } | null;
  onMapReady?: (map: L.Map) => void;
  /** 지정하지 않으면 전국 중심(DEFAULT_CENTER/ZOOM)으로 시작한다 - GA 상세 미니맵처럼
   * 특정 지점으로 바로 확대해서 보여주고 싶을 때 사용한다. */
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMovedRef = useRef(false);
  const programmaticMoveRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView(initialCenter, initialZoom);
    // 기본 OpenStreetMap 타일은 도로/라벨이 빽빽하고 색감이 딱딱해 "행정지도" 느낌이 강하다.
    // CARTO Voyager는 같은 OSM 데이터를 밝고 단순한 색상/라벨로 렌더링해 네이버지도/카카오맵에
    // 가까운 느낌을 준다 - API 키 없이 쓸 수 있는 무료 타일이라 별도 자격증명이 필요 없다.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: createClusterIcon,
    });
    map.addLayer(cluster);
    clusterRef.current = cluster;
    mapRef.current = map;

    map.on('dragstart zoomstart', () => {
      userMovedRef.current = true;
    });
    map.on('moveend', () => {
      const userInitiated = userMovedRef.current && !programmaticMoveRef.current;
      onBoundsChanged(map.getBounds(), userInitiated);
      userMovedRef.current = false;
      programmaticMoveRef.current = false;
    });

    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersRef.current.clear();
    branches.forEach((b) => {
      if (b.lat == null || b.lng == null) return;
      const active = b.id === selectedId;
      const marker = L.marker([b.lat, b.lng], {
        icon: createPinIcon(b.operationType, active),
        zIndexOffset: active ? 1000 : 0,
      });
      marker.on('click', () => onSelect(b.id));
      markersRef.current.set(b.id, marker);
      cluster.addLayer(marker);
    });
  }, [branches, selectedId, onSelect]);

  useEffect(() => {
    if (!flyToTarget) return;
    const target = branches.find((b) => b.id === flyToTarget.id);
    const map = mapRef.current;
    if (!target || target.lat == null || target.lng == null || !map) return;
    programmaticMoveRef.current = true;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget]);

  return <div ref={containerRef} className="h-full w-full" />;
}
