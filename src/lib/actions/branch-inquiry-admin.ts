'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** W-059 - 관리자 또는 소유 파트너가 문의를 읽음 처리한다. RPC 자체가 둘 중
 * 어느 쪽도 아니면 NOT_AUTHORIZED로 거부하므로 여기서는 결과만 반환한다. */
export async function markBranchInquiryReadAction(inquiryId: string): Promise<{ success: boolean }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('mark_branch_inquiry_read', { p_inquiry_id: inquiryId });
  if (error) return { success: false };

  revalidatePath('/admin/inquiries');
  revalidatePath('/partner/inquiries');
  return { success: true };
}
