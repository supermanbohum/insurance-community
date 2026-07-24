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
    .select('id, email, nickname, profile_image, provider, approval_status')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (!data || data.approval_status !== 'approved') return null;

  return {
    id: data.id,
    email: data.email,
    nickname: data.nickname,
    profileImage: data.profile_image,
    provider: data.provider,
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
