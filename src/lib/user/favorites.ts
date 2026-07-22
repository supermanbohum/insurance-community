import 'server-only';
import { mockIsFavorited, mockListFavoriteGaIds } from '@/lib/mock/user-mutations';
import { listPublicGaCompanies } from '@/lib/public/ga';
import type { PublicGaListItem } from '@/lib/public/ga';

/**
 * 회원의 즐겨찾기 GA 조회. 지금은 Mock 전용 구현만 있다(change-requests.ts와 동일한 방침) -
 * 실제 Supabase를 붙일 때 이 파일을 favorites.mock.ts/favorites.supabase.ts로 나누면 된다.
 * GA 요약 포맷은 기존 lib/public/ga.ts를 그대로 재사용해 중복 구현하지 않는다.
 */
export async function listFavoriteGaIds(userId: string): Promise<string[]> {
  return mockListFavoriteGaIds(userId);
}

export async function listFavoriteGas(userId: string): Promise<PublicGaListItem[]> {
  const gaCompanyIds = await listFavoriteGaIds(userId);
  if (gaCompanyIds.length === 0) return [];
  return listPublicGaCompanies({ gaCompanyIds });
}

export async function isGaFavorited(userId: string, gaId: string): Promise<boolean> {
  return mockIsFavorited(userId, gaId);
}
