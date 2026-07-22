'use server';

import { recordBranchContactClick, listPublicBranches } from '@/lib/public/branch';

/** 지점 상세 공개 페이지에서 전화/카카오/홈페이지 등 연락 채널 클릭 시 호출 (문의 클릭 집계). */
export async function recordBranchContactClickAction(contactId: string): Promise<void> {
  await recordBranchContactClick(contactId);
}

export interface SearchSuggestion {
  type: 'branch';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

/** 검색창 자동완성: 지점명(또는 소속 GA명) 상위 일치 결과를 반환한다. */
export async function getSearchSuggestionsAction(query: string): Promise<SearchSuggestion[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const branchResults = await listPublicBranches({ q, sort: 'recommended', limit: 8 });

  return branchResults.map((branch) => ({
    type: 'branch',
    id: branch.id,
    label: branch.name,
    sublabel: [branch.sidoName, branch.sigunguName].filter(Boolean).join(' ') || branch.address,
    href: `/branch/${branch.slug}`,
  }));
}
