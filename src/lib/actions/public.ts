'use server';

import { recordBranchContactClick } from '@/lib/public/branch';

/** 지점 상세 공개 페이지에서 전화/카카오/홈페이지 등 연락 채널 클릭 시 호출 (문의 클릭 집계). */
export async function recordBranchContactClickAction(contactId: string): Promise<void> {
  await recordBranchContactClick(contactId);
}
