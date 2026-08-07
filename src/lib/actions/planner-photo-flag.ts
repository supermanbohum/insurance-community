'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** W-064 - 프로필 사진 심사 플래그 설정/해제. 하드 차단이 아니라 관리자 판단이다 -
 * 플래그된 사진은 공개 뷰에서만 억제되고(0067 마이그레이션), 프로필 자체의 승인
 * 여부와는 무관하다. */
export async function setPlannerPhotoFlagAction(
  profileId: string,
  flagged: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_set_planner_photo_flag', {
    p_profile_id: profileId,
    p_flagged: flagged,
    p_reason: reason ?? null,
  });
  if (error) {
    return { success: false, error: error.message.includes('REASON_REQUIRED') ? 'REASON_REQUIRED' : 'UNKNOWN' };
  }
  revalidatePath(`/admin/planner-market/${profileId}`);
  return { success: true };
}
