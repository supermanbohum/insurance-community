'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { mockLoginOrCreateUser } from '@/lib/mock/user-mutations';
import { USER_SESSION_COOKIE } from '@/lib/auth/session.mock';
import type { AuthProviderType } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * 로그인 버튼 클릭 시 즉시 호출되는 Mock 로그인. 실제 카카오/구글 OAuth 연동 전까지는
 * provider만으로 데모 계정을 만들거나 재사용한다 - 실제 소셜 로그인이 붙으면 이 액션은
 * OAuth 콜백 처리로 교체되고, 세션 조회 쪽(lib/auth/session.ts)만 IS_MOCK_MODE로 갈아끼우면 된다.
 */
export async function loginMockAction(
  provider: AuthProviderType,
  input?: { email?: string; nickname?: string }
): Promise<ActionResult> {
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }
  if (provider === 'email' && !input?.email?.trim()) {
    return { success: false, error: '이메일을 입력해주세요.' };
  }

  const { id } = mockLoginOrCreateUser(provider, input);

  cookies().set(USER_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  cookies().delete(USER_SESSION_COOKIE);
  redirect('/');
}
