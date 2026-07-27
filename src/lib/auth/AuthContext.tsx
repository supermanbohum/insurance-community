'use client';

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserSession } from './types';

type OAuthProvider = 'google';

const APP_OAUTH_RETURN_URL = 'boheommap://auth-callback';

/** react-native-webview가 페이지에 주입하는 전역 - 앱(APK) 내부 WebView에서 열렸는지 판별. */
function isInsideAppWebView(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

interface AuthContextValue {
  user: UserSession | null;
  /** 로그인 요청이 진행 중인지 (버튼 로딩 상태 표시용). */
  isPending: boolean;
  login: (provider: OAuthProvider) => Promise<{ success: boolean; error?: string }>;
}

const UserContext = createContext<AuthContextValue | null>(null);

/**
 * 회원 세션을 앱 전체에 공급하는 클라이언트 Provider("SessionProvider" 역할도 겸한다) -
 * 서버(main 레이아웃)에서 조회한 초기 세션을 `initialUser`로 받아 하이드레이션한다.
 */
export function AuthProvider({ initialUser, children }: { initialUser: UserSession | null; children: React.ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const login = useCallback((provider: OAuthProvider) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        const supabase = createClient();
        // 앱(APK) WebView 안에서는 https 콜백으로 보내면 구글 로그인이 외부 Chrome에서 끝나고
        // 앱으로 돌아오지 못한다. 커스텀 스킴으로 보내면 네이티브 쪽(App.tsx)이 그 리다이렉트를
        // 가로채 WebBrowser.openAuthSessionAsync로 처리한 뒤 앱 내부로 결과를 되돌려준다.
        const redirectTo = isInsideAppWebView() ? APP_OAUTH_RETURN_URL : `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (error) {
          resolve({ success: false, error: error.message });
        }
        // 성공 시 즉시 provider 로그인 화면으로 리다이렉트되므로 이 Promise는 resolve되지 않는다.
      });
    });
  }, []);

  return <UserContext.Provider value={{ user, isPending, login }}>{children}</UserContext.Provider>;
}

/** Auth Hook - 현재 로그인 사용자와 로그인 액션을 제공한다. 로그아웃은 폼(action={logoutAction})으로 처리한다. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
