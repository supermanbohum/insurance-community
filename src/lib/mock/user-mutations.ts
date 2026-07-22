import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { AuthProviderType } from '@/types/database';

const DEFAULT_NICKNAME: Record<AuthProviderType, string> = {
  kakao: '카카오 사용자',
  google: 'Google 사용자',
  email: '보험맵 회원',
};

/**
 * 로그인 버튼 클릭 시 즉시 호출된다 - 실제 소셜 로그인 콜백 대신
 * provider(+선택적 email/nickname)만으로 계정을 찾거나 새로 만든다.
 * 같은 email+provider로 다시 "로그인"하면 새 계정을 만들지 않고 기존 계정을 재사용한다
 * (카카오/구글처럼 email을 안 주는 원클릭 로그인은 provider별 데모 email로 고정해 매번 같은 계정에 로그인되게 한다).
 */
export function mockLoginOrCreateUser(
  provider: AuthProviderType,
  input: { email?: string; nickname?: string; profileImage?: string } = {}
): { id: string } {
  const email = input.email?.trim().toLowerCase() || `${provider}-demo@bohommap.mock`;
  const existing = mockStore.users.find((u) => u.email === email && u.provider === provider);
  if (existing) {
    existing.updated_at = mockStore.nowIso();
    return { id: existing.id };
  }

  const now = mockStore.nowIso();
  const id = mockStore.genId('user');
  mockStore.users.push({
    id,
    auth_user_id: mockStore.genId('mock-auth-user'),
    email,
    nickname: input.nickname?.trim() || DEFAULT_NICKNAME[provider],
    profile_image: input.profileImage ?? null,
    provider,
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export function mockToggleFavorite(userId: string, branchId: string): { favorited: boolean } {
  const existing = mockStore.favorites.find((f) => f.user_id === userId && f.branch_id === branchId);
  if (existing) {
    mockStore.favorites = mockStore.favorites.filter((f) => f.id !== existing.id);
    return { favorited: false };
  }
  mockStore.favorites.push({ id: mockStore.genId('fav'), user_id: userId, branch_id: branchId, created_at: mockStore.nowIso() });
  return { favorited: true };
}

export function mockIsFavorited(userId: string, branchId: string): boolean {
  return mockStore.favorites.some((f) => f.user_id === userId && f.branch_id === branchId);
}

export function mockListFavoriteBranchIds(userId: string): string[] {
  return mockStore.favorites
    .filter((f) => f.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((f) => f.branch_id);
}
