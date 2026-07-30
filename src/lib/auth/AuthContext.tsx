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

export interface SignUpInput {
  username: string;
  password: string;
  name: string;
  email: string;
  contact: string;
  gaCompanyId: string;
}

interface AuthContextValue {
  user: UserSession | null;
  /** 로그인 요청이 진행 중인지 (버튼 로딩 상태 표시용). */
  isPending: boolean;
  login: (provider: OAuthProvider) => Promise<{ success: boolean; error?: string }>;
  /** 일반 회원가입 - 이메일 인증 전이라 세션이 없을 수 있다. 성공해도 로그인 상태가
   * 되는 게 아니라 "이메일을 확인해주세요" 안내로 이어진다. */
  signUpWithEmail: (input: SignUpInput) => Promise<{ success: boolean; error?: string }>;
  /** 아이디 로그인 - Supabase Auth 자체는 이메일 기반이라 아이디→이메일 변환을 먼저 한다. */
  loginWithEmail: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

  const signUpWithEmail = useCallback((input: SignUpInput) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        // signUp()/rpc() 호출이 예상치 못하게 throw하면(네트워크 오류 등) try/catch 없이는
        // 이 Promise가 영원히 resolve되지 않아 "버튼을 눌러도 아무 반응이 없는" 것처럼
        // 보인다 - 반드시 모든 경로에서 resolve되도록 감싼다.
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signUp({
            email: input.email,
            password: input.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/my`,
              data: { username: input.username, name: input.name, contact: input.contact, gaCompanyId: input.gaCompanyId },
            },
          });
          if (error) {
            console.error('[signUpWithEmail] auth.signUp 실패:', error);
            resolve({ success: false, error: error.message.includes('already registered') ? '이미 가입된 이메일입니다.' : error.message });
            return;
          }
          if (!data.user) {
            console.error('[signUpWithEmail] signUp 응답에 user가 없음:', data);
            resolve({ success: false, error: '가입 처리 중 오류가 발생했습니다.' });
            return;
          }
          const { error: profileError } = await supabase.rpc('signup_email_member', {
            p_auth_user_id: data.user.id,
            p_username: input.username,
            p_name: input.name,
            p_contact: input.contact,
            p_ga_company_id: input.gaCompanyId,
          });
          if (profileError) {
            console.error('[signUpWithEmail] signup_email_member 실패:', profileError);
            const message = profileError.message.includes('USERNAME_TAKEN')
              ? '이미 사용 중인 아이디입니다.'
              : profileError.message.includes('INVALID_GA_COMPANY')
                ? '소속 GA를 다시 선택해주세요.'
                : '가입 처리 중 오류가 발생했습니다.';
            resolve({ success: false, error: message });
            return;
          }
          resolve({ success: true });
        } catch (err) {
          console.error('[signUpWithEmail] 예상치 못한 오류:', err);
          resolve({ success: false, error: '가입 처리 중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
        }
      });
    });
  }, []);

  const loginWithEmail = useCallback((username: string, password: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        try {
          const supabase = createClient();
          const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', { p_username: username });
          if (lookupError || !email) {
            console.error('[loginWithEmail] get_email_by_username 실패:', lookupError);
            resolve({ success: false, error: '존재하지 않는 아이디입니다.' });
            return;
          }
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            console.error('[loginWithEmail] signInWithPassword 실패:', error);
            resolve({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
            return;
          }
          resolve({ success: true });
        } catch (err) {
          console.error('[loginWithEmail] 예상치 못한 오류:', err);
          resolve({ success: false, error: '로그인 중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
        }
      });
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, isPending, login, signUpWithEmail, loginWithEmail }}>{children}</UserContext.Provider>
  );
}

/** Auth Hook - 현재 로그인 사용자와 로그인 액션을 제공한다. 로그아웃은 폼(action={logoutAction})으로 처리한다. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
