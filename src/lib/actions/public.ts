'use server';

import { recordBranchContactClick, listPublicBranches } from '@/lib/public/branch';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

/** 지점 상세 공개 페이지에서 전화/카카오/홈페이지 등 연락 채널 클릭 시 호출 (문의 클릭 집계). */
export async function recordBranchContactClickAction(contactId: string): Promise<void> {
  await recordBranchContactClick(contactId);
}

export interface SearchSuggestion {
  type: 'branch' | 'region';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

/** 검색창 자동완성: 지점명/소속 GA명 일치 결과 + 지역명(시/도, 시/군/구) 일치 결과를 함께 반환한다. */
export async function getSearchSuggestionsAction(query: string): Promise<SearchSuggestion[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = createPublicSupabaseClient();
  const [branchResults, { data: regionMatches }] = await Promise.all([
    listPublicBranches({ q, sort: 'recommended', limit: 6 }),
    supabase
      .from('regions')
      .select('sido_code, sido_name, sigungu_name')
      .or(`sido_name.ilike.%${q}%,sigungu_name.ilike.%${q}%`)
      .limit(5),
  ]);

  const seenRegionLabels = new Set<string>();
  const regionSuggestions: SearchSuggestion[] = (regionMatches ?? [])
    .map((r) => ({
      sidoCode: r.sido_code,
      label: r.sigungu_name ? `${r.sido_name} ${r.sigungu_name}` : r.sido_name,
    }))
    .filter((r) => {
      if (seenRegionLabels.has(r.label)) return false;
      seenRegionLabels.add(r.label);
      return true;
    })
    .map((r) => ({
      type: 'region' as const,
      id: r.label,
      label: r.label,
      sublabel: '지역',
      href: `/region/${r.sidoCode}`,
    }));

  const branchSuggestions: SearchSuggestion[] = branchResults.map((branch) => ({
    type: 'branch',
    id: branch.id,
    label: branch.name,
    sublabel: [branch.sidoName, branch.sigunguName].filter(Boolean).join(' ') || branch.address,
    href: `/branch/${branch.slug}`,
  }));

  return [...regionSuggestions, ...branchSuggestions];
}
