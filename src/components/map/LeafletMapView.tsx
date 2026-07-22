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
  const size = active ? 36 : 28;
  return L.divIcon({
    className: 'bohommap-pin',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(15,23,42,0.35);
      border:2px solid #fff;
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const cluster = L.markerClusterGroup({ maxClusterRadius: 48, spiderfyOnMaxZoom: true });
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
      const marker = L.marker([b.lat, b.lng], { icon: createPinIcon(b.operationType, b.id === selectedId) });
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
