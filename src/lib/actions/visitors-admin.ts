'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 오늘 방문자수 관리자 보정값을 설정한다(하루 1개 값, 다시 저장하면 덮어씀).
 * 홈 화면 "오늘 방문자"와 관리자 대시보드가 즉시 이 값을 반영한 숫자를 보여준다
 * (get_today_site_traffic_stats()가 site_visit_adjustments를 더해서 계산하므로). */
export async function setVisitorAdjustmentAction(delta: number, reason: string): Promise<ActionResult> {
  if (!Number.isInteger(delta)) {
    return { success: false, error: '숫자를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_set_visitor_adjustment', {
    p_delta: delta,
    p_reason: reason.trim() || undefined,
  });
  if (error) {
    return { success: false, error: '처리하지 못했습니다.' };
  }

  revalidatePath('/admin/visitors');
  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}
