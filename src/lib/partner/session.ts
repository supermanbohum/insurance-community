import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { mockStore, type MockGaAdminUser } from '@/lib/mock/store';

/**
 * GA 파트너(운영자) 세션. admin_users(플랫폼 최고관리자)와 완전히 분리된 별도 인증 체계다.
 *
 * 지금은 Mock 전용 구현만 존재한다 (lib/admin/session.ts처럼 .mock.ts/.supabase.ts로
 * 나누지 않았다) - 실제 Supabase Auth를 연결할 때, 이 파일을 그 패턴대로 분리하고
 * 여기 쿠키 기반 세션 대신 auth.getUser() + ga_admin_users 조회로 교체하면 된다.
 */
export type PartnerSession = MockGaAdminUser;

export const PARTNER_SESSION_COOKIE = 'partner_session';

export async function getCurrentPartner(): Promise<PartnerSession | null> {
  const id = cookies().get(PARTNER_SESSION_COOKIE)?.value;
  if (!id) return null;
  const partner = mockStore.gaAdminUsers.find((g) => g.id === id && g.is_active);
  return partner ?? null;
}

/** /partner/(protected) 진입 가드. 로그인 안 되어 있으면 로그인 화면으로 리다이렉트. */
export async function requirePartner(): Promise<PartnerSession> {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect('/partner/login');
  }
  return partner;
}
