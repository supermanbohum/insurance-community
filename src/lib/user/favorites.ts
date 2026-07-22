import 'server-only';
import { mockIsFavorited, mockListFavoriteBranchIds } from '@/lib/mock/user-mutations';
import { listPublicBranches } from '@/lib/public/branch';
import type { PublicBranchSummary } from '@/types/database';

/**
 * 회원의 즐겨찾기 지점 조회. 지금은 Mock 전용 구현만 있다(change-requests.ts와 동일한 방침) -
 * 실제 Supabase를 붙일 때 이 파일을 favorites.mock.ts/favorites.supabase.ts로 나누면 된다.
 * 지점 요약 포맷은 기존 lib/public/branch.ts를 그대로 재사용해 중복 구현하지 않는다.
 */
export async function listFavoriteBranchIds(userId: string): Promise<string[]> {
  return mockListFavoriteBranchIds(userId);
}

export async function listFavoriteBranches(userId: string): Promise<PublicBranchSummary[]> {
  const branchIds = await listFavoriteBranchIds(userId);
  if (branchIds.length === 0) return [];
  return listPublicBranches({ branchIds });
}

export async function isBranchFavorited(userId: string, branchId: string): Promise<boolean> {
  return mockIsFavorited(userId, branchId);
}
