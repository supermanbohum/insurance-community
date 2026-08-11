'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * ⑪ 표시 중단 - 지도에서 내리고 다시 수집되지 않게 한다(0097).
 *
 * 🔴 사유(reason)는 선택이다. 오너 확정 정책이 "표시 삭제 요청은 논쟁 없이 즉시
 * 처리하고 사유를 묻지 않는다"이다 - 우리가 동의 없이 올린 것이라 "왜 지우냐"고
 * 물을 자격이 없다. 운영자가 참고용으로 남기고 싶을 때만 적는다.
 */
export async function suppressExternalPoiAction(source: string, externalId: string, reason?: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_suppress_external_poi', {
    p_source: source,
    p_external_id: externalId,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidatePath('/admin/map-pois');
  return { success: true };
}

/** 표시 중단 해제 - 다시 수집 대상이 된다는 뜻이고, 행이 즉시 되살아나지는 않는다
 * (다음 수집 배치가 실제로 그 장소를 다시 가져와야 화면에 돌아온다). */
export async function unsuppressExternalPoiAction(source: string, externalId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('admin_unsuppress_external_poi', {
    p_source: source,
    p_external_id: externalId,
  });
  if (error) return { success: false, error: '처리하지 못했습니다.' };
  revalidatePath('/admin/map-pois');
  return { success: true };
}
