'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 채팅 메시지 전송 - 실제 권한 체크는 send_chat_message RPC(is_full_member()) 안에서
 * 이뤄진다. 이 액션은 얇은 래퍼일 뿐이다. */
export async function sendChatMessageAction(body: string): Promise<ActionResult> {
  if (!body.trim()) {
    return { success: false, error: '메시지를 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('send_chat_message', { p_body: body.trim() });

  if (error) {
    const message = error.message.includes('NOT_FULL_MEMBER')
      ? '일반 회원가입 후 이용 가능한 기능입니다.'
      : error.message.includes('MESSAGE_TOO_LONG')
        ? '메시지는 500자 이내로 입력해주세요.'
        : '메시지를 보내지 못했습니다. 잠시 후 다시 시도해주세요.';
    return { success: false, error: message };
  }

  return { success: true };
}
