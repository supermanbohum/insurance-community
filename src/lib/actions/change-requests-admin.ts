'use server';

import { revalidatePath } from 'next/cache';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { mockReviewChangeRequest } from '@/lib/mock/admin-mutations';
import { requireAdmin } from '@/lib/admin/session';
import type { ChangeRequestStatus } from '@/lib/mock/store';

export type ActionResult = { success: true } | { success: false; error: string };

/** 슈퍼관리자의 변경요청 승인/반려/수정요청. 승인 시 대상 GA/지점에 즉시 반영된다. */
export async function reviewChangeRequestAction(
  requestId: string,
  decision: Exclude<ChangeRequestStatus, 'pending'>,
  reason?: string
): Promise<ActionResult> {
  if ((decision === 'rejected' || decision === 'changes_requested') && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }
  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const admin = await requireAdmin();

  try {
    mockReviewChangeRequest(requestId, admin.id, decision, reason?.trim());
  } catch {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/change-requests');
  revalidatePath(`/admin/change-requests/${requestId}`);
  revalidatePath('/admin/ga');
  revalidatePath('/partner');
  revalidatePath('/ga');
  return { success: true };
}
