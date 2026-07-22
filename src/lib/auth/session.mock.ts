import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { mockStore } from '@/lib/mock/store';
import type { UserSession } from './types';

/**
 * MockAuthProvider - 실제 Supabase Auth 없이 쿠키 하나로 로그인 상태를 흉내낸다.
 * `partner/session.ts`와 동일한 패턴(쿠키 값 = 레코드 id, mockStore 배열 조회).
 * IS_MOCK_MODE=false로 바뀌면 session.supabase.ts(SupabaseAuthProvider)가 대신 쓰인다.
 */
export const USER_SESSION_COOKIE = 'user_session';

function toUserSession(user: (typeof mockStore.users)[number]): UserSession {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    profileImage: user.profile_image,
    provider: user.provider,
  };
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const id = cookies().get(USER_SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = mockStore.users.find((u) => u.id === id);
  return user ? toUserSession(user) : null;
}

/** 회원 전용 페이지 진입 가드. 로그인 안 되어 있으면 로그인 화면으로 리다이렉트. */
export async function requireUser(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
