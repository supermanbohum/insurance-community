import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

export interface SidoGroup {
  sidoCode: string;
  sidoName: string;
}

export interface SigunguItem {
  regionId: string;
  sigunguCode: string | null;
  sigunguName: string | null;
}

export async function listSidoGroups(): Promise<SidoGroup[]> {
  // 홈 화면에서 쓰이므로 cookies()를 건드리지 않는 공개 클라이언트를 쓴다(ISR 캐시 유지).
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('regions').select('sido_code, sido_name').order('sort_order');
  if (error) throw error;

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    if (!seen.has(row.sido_code)) seen.set(row.sido_code, row.sido_name);
  }
  return Array.from(seen.entries())
    .map(([sidoCode, sidoName]) => ({ sidoCode, sidoName }))
    .sort((a, b) => a.sidoName.localeCompare(b.sidoName, 'ko'));
}

// generateMetadata와 페이지 컴포넌트가 같은 요청 안에서 각각 호출하므로 react cache()로
// 요청 단위 메모이제이션한다(요청 간에는 공유되지 않음 - 오래된 데이터가 남지 않는다).
export const listSigunguBySido = cache(async function listSigunguBySido(
  sidoCode: string
): Promise<{ sidoName: string; items: SigunguItem[] }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('regions')
    .select('id, sido_name, sigungu_code, sigungu_name')
    .eq('sido_code', sidoCode)
    .order('sort_order');
  if (error) throw error;

  const rows = data ?? [];
  return {
    sidoName: rows[0]?.sido_name ?? '',
    items: rows
      .filter((r) => r.sigungu_code)
      .map((r) => ({ regionId: r.id, sigunguCode: r.sigungu_code, sigunguName: r.sigungu_name })),
  };
});

export async function getRegionById(regionId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('regions').select('*').eq('id', regionId).maybeSingle();
  if (error) throw error;
  return data;
}

/** sitemap.xml 전용 - 시/도 + 시/군/구 코드 전체를 한 번에 가져온다(regions 테이블은 행 수가
 * 적어 무겁지 않다). /region/[sido], /region/[sido]/[sigungu] 항목을 여기서 조립한다. */
export async function listAllRegionsForSitemap(): Promise<{ sidoCode: string; sigunguCode: string | null }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('regions').select('sido_code, sigungu_code');
  if (error) throw error;
  return (data ?? []).map((row) => ({ sidoCode: row.sido_code, sigunguCode: row.sigungu_code }));
}
