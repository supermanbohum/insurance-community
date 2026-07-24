import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export type PartnerSession = Database['public']['Tables']['ga_admin_users']['Row'];

/**
 * 현재 요청의 Supabase 세션이 활성 ga_admin_users 계정인지 확인한다.
 * admin/session.supabase.ts와 동일한 패턴 - service role로 조회하되 세션 자체는
 * auth.getUser()로 서버에서 재검증한다.
 */
export async function getCurrentPartner(): Promise<PartnerSession | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('ga_admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return data ?? null;
}

/** /partner/(protected) 진입 가드. 로그인 안 되어 있으면 로그인 화면으로 리다이렉트. */
export async function requirePartner(): Promise<PartnerSession> {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect('/partner/login');
  }
  return partner;
}
