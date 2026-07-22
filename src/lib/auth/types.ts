import type { AuthProviderType } from '@/types/database';

/** 화면에 노출되는 로그인 사용자 표시값. */
export interface UserSession {
  id: string;
  email: string | null;
  nickname: string;
  profileImage: string | null;
  provider: AuthProviderType;
}

/**
 * 인증 Provider가 지켜야 하는 구조적 계약.
 * `session.mock.ts`(MockAuthProvider)와 `session.supabase.ts`(SupabaseAuthProvider)가
 * 각각 이 형태를 만족하도록 구현하고, `session.ts`가 IS_MOCK_MODE에 따라 골라 쓴다 -
 * IS_MOCK_MODE=false로 바꾸는 것만으로 실제 Supabase Auth로 전환된다.
 */
export interface AuthSessionProvider {
  getCurrentUser(): Promise<UserSession | null>;
}
