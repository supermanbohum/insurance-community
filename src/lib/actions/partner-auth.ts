'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

export async function signupPartnerAction(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!email || !input.password || !displayName) {
    return { success: false, error: '모든 항목을 입력해주세요.' };
  }
  if (input.password.length < 8) {
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password: input.password });

  if (error) {
    return { success: false, error: error.message === 'User already registered' ? '이미 가입된 이메일입니다.' : error.message };
  }

  if (!data.session) {
    // 이메일 확인이 켜져 있으면 signUp 직후에는 세션이 없다 - 확인 후 로그인 시 계정이 만들어진다.
    return { success: false, error: '가입 확인 이메일을 보냈습니다. 메일함을 확인한 뒤 로그인해주세요.' };
  }

  const { error: rpcError } = await supabase.rpc('signup_ga_admin', { p_display_name: displayName });
  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  return { success: true };
}

export async function loginPartnerAction(input: { email: string; password: string }): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });

  if (error || !data.session) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  // 가입 시 이메일 확인 때문에 ga_admin_users 행이 아직 없을 수 있으므로 로그인 시점에도 보장한다.
  const { error: rpcError } = await supabase.rpc('signup_ga_admin', { p_display_name: null });
  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  return { success: true };
}

export async function logoutPartnerAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/partner/login');
}
