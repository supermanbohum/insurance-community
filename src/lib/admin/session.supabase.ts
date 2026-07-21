import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export type AdminSession = Database['public']['Tables']['admin_users']['Row'];

/**
 * 현재 요청의 Supabase 세션이 활성 admin_users 계정인지 확인한다.
 * admin_users는 RLS로 전면 비공개이므로(0002 참고) service role로 조회하되,
 * 조회 전 auth.getUser()로 세션 자체를 서버에서 재검증한다.
 */
export async function getCurrentAdmin(): Promise<AdminSession | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return data ?? null;
}

/** /admin 보호 페이지 진입 가드. 활성 관리자가 아니면 로그인 화면으로 리다이렉트. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect('/admin/login');
  }
  return admin;
}
