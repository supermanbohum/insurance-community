'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 앱 브릿지(postMessage `push-token`)가 전달한 Expo Push Token 저장 - BRIDGE_PROTOCOL.md의
 * "웹팀 액션 아이템" 중 하나. 세 인증 시스템(일반회원/GA파트너/관리자) 중 어느 쪽으로
 * 로그인했든 auth.uid() 기준으로 저장되므로 이 액션은 로그인 종류를 구분하지 않는다. */
export async function registerPushTokenAction(token: string, platform: 'ios' | 'android'): Promise<ActionResult> {
  if (!token.trim()) {
    return { success: false, error: 'INVALID_TOKEN' };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }

  const { error } = await supabase.rpc('register_push_token', { p_token: token.trim(), p_platform: platform });
  if (error) {
    return { success: false, error: '푸시 토큰을 저장하지 못했습니다.' };
  }
  return { success: true };
}

/** 로그아웃/푸시 권한 해제 시 토큰 제거. */
export async function unregisterPushTokenAction(token: string): Promise<ActionResult> {
  if (!token.trim()) {
    return { success: false, error: 'INVALID_TOKEN' };
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token.trim() });
  if (error) {
    return { success: false, error: '푸시 토큰을 해제하지 못했습니다.' };
  }
  return { success: true };
}
