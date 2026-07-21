'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminLoginState {
  error: string | null;
}

const GENERIC_ERROR = '이메일 또는 비밀번호가 올바르지 않습니다.';

export async function signInAdminAction(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: GENERIC_ERROR };
  }

  // admin_users는 RLS로 전면 비공개라 service role로 활성 계정 여부를 확인한다.
  const adminClient = createAdminClient();
  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', data.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!adminRow) {
    // 관리자 계정이 아닌데 로그인만 성공한 상태로 세션이 남지 않도록 즉시 종료한다.
    await supabase.auth.signOut();
    return { error: '관리자 계정이 아닙니다.' };
  }

  redirect('/admin');
}

export async function signOutAdminAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
