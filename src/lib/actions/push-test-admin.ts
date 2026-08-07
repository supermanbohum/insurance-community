'use server';

import { requireAdmin } from '@/lib/admin/session';
import { sendExpoPushRaw } from '@/lib/push/expo';

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * 관리자 본인 기기로만 테스트 푸시를 보낸다 - 실제 문의 폼으로 테스트하면 실지점
 * 담당자에게 가짜 리드가 가므로(CTO 지적), 파이프라인 검증은 이 경로로만 한다.
 * sendExpoPushRaw를 직접 써서 조용한 시간대 제약도 받지 않는다(관리자가 명시적으로
 * 트리거하는 발송이라 언제 보내도 문제없다).
 */
export async function sendAdminTestPushAction(title: string, body: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!title.trim() || !body.trim()) {
    return { success: false, error: '제목과 내용을 입력해주세요.' };
  }

  await sendExpoPushRaw([admin.auth_user_id], { title: title.trim(), body: body.trim() });
  return { success: true };
}
