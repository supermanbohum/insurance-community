'use client';

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserSession } from './types';

type OAuthProvider = 'kakao';

const APP_OAUTH_RETURN_URL = 'boheommap://auth-callback';

/** react-native-webview가 페이지에 주입하는 전역 - 앱(APK) 내부 WebView에서 열렸는지 판별. */
function isInsideAppWebView(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

/** Error 인스턴스는 JSON.stringify하면 {}가 되므로 own property를 직접 뽑아 안전하게 직렬화한다. */
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  try {
    if (value instanceof Error) {
      const plain: Record<string, unknown> = { name: value.name, message: value.message, stack: value.stack };
      for (const key of Object.keys(value)) plain[key] = (value as unknown as Record<string, unknown>)[key];
      return JSON.stringify(plain);
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Supabase AuthError/PostgrestError/일반 Error/알 수 없는 값 모두에서 message/code/status/details/hint를 뽑아
 * 사람이 읽을 수 있는 한 줄로 만든다 - 원인 진단을 위해 절대 이 정보를 숨기거나 뭉뚱그리지 않는다. */
function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const parts: string[] = [];
    if (e.message) parts.push(`message="${String(e.message)}"`);
    if (e.code !== undefined) parts.push(`code=${String(e.code)}`);
    if (e.status !== undefined) parts.push(`status=${String(e.status)}`);
    if (e.details) parts.push(`details="${String(e.details)}"`);
    if (e.hint) parts.push(`hint="${String(e.hint)}"`);
    if (e.name) parts.push(`name=${String(e.name)}`);
    if (parts.length > 0) return `${parts.join(', ')} | raw=${safeStringify(err)}`;
  }
  return `raw=${safeStringify(err)}`;
}

export interface SignUpInput {
  username: string;
  password: string;
  name: string;
  email: string;
  contact: string;
  gaCompanyId: string;
  /** 이메일 인증 완료 후 돌아갈 경로 (예: /partner/register). 기본값은 /my. */
  next?: string;
}

interface AuthContextValue {
  user: UserSession | null;
  /** 로그인 요청이 진행 중인지 (버튼 로딩 상태 표시용). */
  isPending: boolean;
  /** 카카오 소셜 로그인(W-033) - 성공 시 카카오 로그인 화면으로 리다이렉트되므로 이
   * Promise는 보통 resolve되지 않는다(페이지 이탈). */
  login: (provider: OAuthProvider, next?: string) => Promise<{ success: boolean; error?: string }>;
  /** 일반 회원가입 - 이메일 인증 전이라 세션이 없을 수 있다. 성공해도 로그인 상태가
   * 되는 게 아니라 "이메일을 확인해주세요" 안내로 이어진다. */
  signUpWithEmail: (input: SignUpInput) => Promise<{ success: boolean; error?: string }>;
  /** 아이디 로그인 - Supabase Auth 자체는 이메일 기반이라 아이디→이메일 변환을 먼저 한다. */
  loginWithEmail: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** 인증 메일 재발송(W-034) - /verify-email에서 "로그인은 됐지만 이메일 미인증" 상태인
   * 사용자에게 다음 행동을 준다. */
  resendVerificationEmail: (email: string, next: string) => Promise<{ success: boolean; error?: string }>;
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

  const login = useCallback((provider: OAuthProvider, next?: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        const supabase = createClient();
        // 앱(APK) WebView 안에서는 https 콜백으로 보내면 카카오 로그인이 외부 브라우저에서
        // 끝나고 앱으로 돌아오지 못한다. 커스텀 스킴으로 보내면 네이티브 쪽(App.tsx)이 그
        // 리다이렉트를 가로채 WebBrowser.openAuthSessionAsync로 처리한 뒤 앱 내부로 결과를
        // 되돌려준다.
        const nextParam = next ? `?next=${encodeURIComponent(next)}` : '';
        const redirectTo = isInsideAppWebView() ? APP_OAUTH_RETURN_URL : `${window.location.origin}/auth/callback${nextParam}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            // 카카오 비즈 앱 전환 전이라 카카오계정(이메일)·프로필 사진 동의항목이
            // 콘솔에서 아직 신청 불가(회색) 상태다 - Supabase 기본 scope(account_email
            // 포함)를 그대로 쓰면 카카오가 "설정되지 않은 동의항목"으로 보고 KOE205로
            // 거부한다. 우리는 연락처를 자체 폼에서 받으므로 이메일이 필요 없고, 프로필
            // 사진을 쓰는 화면도 없다 - 닉네임 하나만 요청한다.
            scopes: 'profile_nickname',
          },
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
        // 보인다 - 반드시 모든 경로에서 resolve되도록 감싼다. 실패 시 message/code/status
        // 등을 뭉뚱그리지 않고 그대로 노출해 향후 문제 발생 시 원인을 바로 알 수 있게 한다.
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signUp({
            email: input.email,
            password: input.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(input.next ?? '/my')}`,
              data: { username: input.username, name: input.name, contact: input.contact, gaCompanyId: input.gaCompanyId },
            },
          });
          if (error) {
            const detail = describeError(error);
            console.error('[signUpWithEmail] auth.signUp 실패 - 전체 에러 객체:', error, detail);
            resolve({ success: false, error: `[auth.signUp] ${detail}` });
            return;
          }
          if (!data.user) {
            console.error('[signUpWithEmail] signUp 응답에 user가 없음 - 전체 응답:', data);
            resolve({ success: false, error: `[auth.signUp] user 없음. 응답: ${safeStringify(data)}` });
            return;
          }
          // 프로필(public.users) 생성은 여기서 하지 않는다 - 세션이 없는 상태라 auth.uid()를
          // 쓸 수 없어 클라이언트가 넘긴 auth_user_id를 신뢰해야 했고, 그 구조 자체가
          // INVALID_AUTH_USER 오류의 원인이었다. username/name/contact/gaCompanyId는 이미
          // options.data로 auth.users.raw_user_meta_data에 저장됐으므로, 이메일 인증 완료로
          // 실제 세션이 생기는 시점(/auth/callback → confirm_email_signup)에 그때의
          // auth.uid()로 프로필을 만든다 - 그 시점엔 auth.users 존재가 항상 보장된다.
          resolve({ success: true });
        } catch (err) {
          const detail = describeError(err);
          console.error('[signUpWithEmail] 예상치 못한 예외 - 전체 객체:', err, detail);
          resolve({ success: false, error: `[예외] ${detail}` });
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

  const resendVerificationEmail = useCallback((email: string, next: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
          });
          if (error) {
            const detail = describeError(error);
            console.error('[resendVerificationEmail] resend 실패:', error, detail);
            resolve({ success: false, error: `[auth.resend] ${detail}` });
            return;
          }
          resolve({ success: true });
        } catch (err) {
          const detail = describeError(err);
          console.error('[resendVerificationEmail] 예상치 못한 예외:', err, detail);
          resolve({ success: false, error: `[예외] ${detail}` });
        }
      });
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, isPending, login, signUpWithEmail, loginWithEmail, resendVerificationEmail }}>
      {children}
    </UserContext.Provider>
  );
}

/** Auth Hook - 현재 로그인 사용자와 로그인 액션을 제공한다. 로그아웃은 폼(action={logoutAction})으로 처리한다. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
