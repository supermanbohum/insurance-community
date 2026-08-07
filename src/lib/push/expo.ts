import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** 21시~08시(KST) 발송 금지 - APP_GROWTH_PLAN §4.5. 개인화 알림(문의 도착 등)도
 * 예외 없이 적용한다 - "즉시성"보다 이 제약이 우선한다는 게 성장 계획의 명시적 요구. */
export function isWithinQuietHours(now = new Date()): boolean {
  const kstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  return kstHour >= 21 || kstHour < 8;
}

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** auth_user_id 목록이 등록해둔 모든 기기로 발송한다. 실패해도 절대 throw하지 않는다
 * - 푸시 발송은 부가 기능이라 원래 하려던 동작(문의 접수 등)을 막으면 안 된다.
 * 조용한 시간대(21시~08시 KST)면 그냥 아무것도 하지 않는다(큐잉하지 않음 - 지금
 * 범위에서는 "즉시 알림"의 정의상 시간이 지나 보내는 건 다른 기능이다). */
export async function sendExpoPushToUsers(authUserIds: string[], message: PushMessage): Promise<void> {
  if (authUserIds.length === 0 || isWithinQuietHours()) return;

  try {
    const admin = createAdminClient();
    const { data: tokens } = await admin.from('push_tokens').select('token').in('auth_user_id', authUserIds);
    if (!tokens || tokens.length === 0) return;

    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: message.title, body: message.body, data: message.data }))),
    });
  } catch (error) {
    console.error('[expo-push] 발송 실패:', error);
  }
}
