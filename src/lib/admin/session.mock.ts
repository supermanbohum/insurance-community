import 'server-only';
import type { AdminSession } from './session.supabase';

/**
 * Mock 모드에서는 실제 로그인 없이 항상 활성 관리자로 취급한다.
 * DB/인증이 준비되면 IS_MOCK_MODE를 false로 바꿔 session.supabase.ts로 전환한다.
 */
const MOCK_ADMIN: AdminSession = {
  id: 'mock-admin-1',
  auth_user_id: 'mock-auth-user-1',
  email: 'admin@bohommap.mock',
  display_name: '(Mock) 관리자',
  role: 'super_admin',
  can_adjust_metrics: true,
  can_override_best: true,
  can_edit_author_name: true,
  can_change_created_at: true,
  can_pin_posts: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  return MOCK_ADMIN;
}

export async function requireAdmin(): Promise<AdminSession> {
  return MOCK_ADMIN;
}
