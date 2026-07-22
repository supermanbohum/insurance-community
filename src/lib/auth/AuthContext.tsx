'use client';

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginMockAction } from '@/lib/actions/user-auth';
import type { UserSession } from './types';
import type { AuthProviderType } from '@/types/database';

interface AuthContextValue {
  user: UserSession | null;
  /** 로그인 요청이 진행 중인지 (버튼 로딩 상태 표시용). */
  isPending: boolean;
  login: (
    provider: AuthProviderType,
    input?: { email?: string; nickname?: string }
  ) => Promise<{ success: boolean; error?: string }>;
}

const UserContext = createContext<AuthContextValue | null>(null);

/**
 * 회원 세션을 앱 전체에 공급하는 클라이언트 Provider("SessionProvider" 역할도 겸한다) -
 * 서버(main 레이아웃)에서 조회한 초기 세션을 `initialUser`로 받아 하이드레이션하고,
 * `router.refresh()`가 일어날 때마다(로그인 직후 등) 레이아웃이 다시 내려주는 최신 값으로 동기화한다.
 */
export function AuthProvider({ initialUser, children }: { initialUser: UserSession | null; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const login = useCallback(
    (provider: AuthProviderType, input?: { email?: string; nickname?: string }) => {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        startTransition(async () => {
          const result = await loginMockAction(provider, input);
          if (result.success) {
            router.refresh();
            resolve({ success: true });
          } else {
            resolve({ success: false, error: result.error });
          }
        });
      });
    },
    [router]
  );

  return <UserContext.Provider value={{ user, isPending, login }}>{children}</UserContext.Provider>;
}

/** Auth Hook - 현재 로그인 사용자와 로그인 액션을 제공한다. 로그아웃은 폼(action={logoutAction})으로 처리한다. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
