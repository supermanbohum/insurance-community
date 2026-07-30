'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';

export type ActionResult = { success: true } | { success: false; error: string };

/** 마이페이지 - 연락처 변경. */
export async function updateContactAction(contact: string): Promise<ActionResult> {
  if (!contact.trim()) {
    return { success: false, error: '연락처를 입력해주세요.' };
  }
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_my_contact', { p_contact: contact.trim() });
  if (error) {
    return { success: false, error: '연락처를 변경하지 못했습니다.' };
  }
  revalidatePath('/my');
  return { success: true };
}

/** 마이페이지 - 소속 GA 변경 신청. 즉시 반영되지 않고 관리자 승인 후 반영된다. */
export async function requestGaChangeAction(gaCompanyId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('request_ga_change', { p_ga_company_id: gaCompanyId });
  if (error) {
    const message = error.message.includes('PENDING_REQUEST_EXISTS')
      ? '이미 대기중인 변경 신청이 있습니다.'
      : error.message.includes('SAME_GA')
        ? '현재 소속과 동일합니다.'
        : error.message.includes('NOT_FULL_MEMBER')
          ? '일반 회원가입 완료 후 이용 가능합니다.'
          : '신청하지 못했습니다.';
    return { success: false, error: message };
  }
  revalidatePath('/my');
  return { success: true };
}

export interface MyGaChangeRequest {
  id: string;
  requestedGaCompanyId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewReason: string | null;
  createdAt: string;
}

export async function listMyGaChangeRequestsAction(): Promise<MyGaChangeRequest[]> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('list_my_ga_change_requests');
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    requestedGaCompanyId: row.requested_ga_company_id,
    status: row.status,
    reviewReason: row.review_reason,
    createdAt: row.created_at,
  }));
}
