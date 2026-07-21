import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { SidoGroup, SigunguItem } from './region.supabase';

export async function listSidoGroups(): Promise<SidoGroup[]> {
  const seen = new Map<string, string>();
  for (const row of mockStore.regions) {
    if (!seen.has(row.sido_code)) seen.set(row.sido_code, row.sido_name);
  }
  return Array.from(seen.entries()).map(([sidoCode, sidoName]) => ({ sidoCode, sidoName }));
}

export async function listSigunguBySido(sidoCode: string): Promise<{ sidoName: string; items: SigunguItem[] }> {
  const rows = mockStore.regions.filter((r) => r.sido_code === sidoCode).sort((a, b) => a.sort_order - b.sort_order);
  return {
    sidoName: rows[0]?.sido_name ?? '',
    items: rows
      .filter((r) => r.sigungu_code)
      .map((r) => ({ regionId: r.id, sigunguCode: r.sigungu_code, sigunguName: r.sigungu_name })),
  };
}

export async function getRegionById(regionId: string) {
  return mockStore.regions.find((r) => r.id === regionId) ?? null;
}
