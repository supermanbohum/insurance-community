import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserSession } from './types';

/**
 * SupabaseAuthProvider - 휴면 코드. 실제 Supabase 프로젝트 + 카카오/구글 OAuth 앱이
 * 연결되면 IS_MOCK_MODE=false 전환만으로 이 구현이 쓰이기 시작한다.
 * admin/session.supabase.ts와 동일한 패턴: auth.getUser()로 세션을 검증한 뒤
 * users 테이블에서 auth_user_id로 프로필을 조회한다.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data } = await supabase
    .from('users')
    .select(
      'id, email, nickname, profile_image, provider, approval_status, username, contact, email_verified_at, kakao_verified_contact, ga_company_id'
    )
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (!data || data.approval_status !== 'approved') return null;

  return {
    id: data.id,
    email: data.email,
    nickname: data.nickname,
    profileImage: data.profile_image,
    provider: data.provider,
    username: data.username,
    contact: data.contact,
    gaCompanyId: data.ga_company_id,
    // is_full_member() SQL 헬퍼(0061)와 동일한 조건 - 한쪽만 바뀌지 않도록 주의(W-033).
    isFullMember:
      (data.provider === 'email' && data.email_verified_at !== null) ||
      (data.provider === 'kakao' && data.kakao_verified_contact !== null),
  };
}

/** 회원 전용 페이지 진입 가드. 로그인 안 되어 있으면 로그인 화면으로 리다이렉트. */
export async function requireUser(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * 정회원(isFullMember) 전용 페이지 진입 가드(W-034) - 로그인 자체가 안 됐으면 /login으로,
 * "로그인은 됐지만 정회원이 아닌" 경우(이메일 미인증, 또는 provider가 email이 아닌 경우)에는
 * /login이 아니라 /verify-email로 보낸다. 로그인 페이지는 "이미 로그인된 사용자"를 next로
 * 그대로 돌려보내므로, 여기서 /login으로 보내면 그 사용자가 다시 이 가드에 걸려 /login으로
 * 튕기는 무한 루프가 된다(오너 계정에서 실제로 재현됨) - 반드시 /verify-email을 거치게 한다.
 */
export async function requireFullMember(next: string): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!user.isFullMember) {
    redirect(`/verify-email?next=${encodeURIComponent(next)}`);
  }
  return user;
}
