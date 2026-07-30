import type { AuthProviderType } from '@/types/database';

/** 화면에 노출되는 로그인 사용자 표시값. */
export interface UserSession {
  id: string;
  email: string | null;
  nickname: string;
  profileImage: string | null;
  provider: AuthProviderType;
  username: string | null;
  contact: string | null;
  gaCompanyId: string | null;
  /** 일반 회원가입 + 이메일 인증까지 완료한 회원인지 - 채팅/지점등록/TOP설계사등록 등
   * 회원 전용 기능의 접근 기준이다. 구글 로그인 회원은 항상 false(DB의 is_full_member()와
   * 동일한 조건을 여기서도 유지한다 - 한쪽만 바뀌지 않도록 주의). */
  isFullMember: boolean;
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
