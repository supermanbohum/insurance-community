'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

/** 관리자의 지점 등록/수정 요청 승인·반려. 승인 시 대상 지점에 즉시 반영된다. */
export async function reviewChangeRequestAction(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<ActionResult> {
  if (decision === 'rejected' && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('review_branch_registration', {
    p_registration_id: requestId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });

  if (error) {
    const message = error.message.includes('MISSING_')
      ? '필수 서류 또는 사진이 모두 등록되지 않았습니다.'
      : error.message.includes('INTRO_TEXT_TOO_SHORT')
        ? '지점 소개글이 최소 50자 미만입니다.'
        : '처리하지 못했습니다.';
    return { success: false, error: message };
  }

  revalidatePath('/admin/change-requests');
  revalidatePath(`/admin/change-requests/${requestId}`);
  revalidatePath('/admin/ga');
  revalidatePath('/partner');
  revalidatePath('/search');
  revalidatePath('/map');
  revalidatePath('/');
  return { success: true };
}

/**
 * 필수 항목(명함·대표사진·사무실사진 5장·소개글 50자)이 없어도 승인한다.
 *
 * 🔴 기본 승인(reviewChangeRequestAction)의 검사는 그대로 둔다. 이건 별도 경로다 —
 *    운영진이 「없는 걸 알면서」 통과시킬 때만 쓴다(오너 지시 2026-08-21).
 *    무엇이 비어 있었는지는 RPC가 감사 로그와 review_reason에 남긴다.
 */
export async function forceApproveChangeRequestAction(
  requestId: string,
  reason?: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('force_approve_branch_registration', {
    p_registration_id: requestId,
    p_reason: reason?.trim() || undefined,
  });

  if (error) {
    // 🔴 SQL 미적용 상태를 「처리하지 못했습니다」로 뭉뚱그리지 않는다.
    //    전례: 화면은 배포됐는데 마이그레이션이 안 들어가 버튼이 죽어 있었고,
    //    메시지가 모호해서 원인을 찾는 데 시간을 썼다. 원인을 그대로 말한다.
    const notDeployed =
      error.code === 'PGRST202' || /Could not find the function|does not exist/i.test(error.message);
    if (notDeployed) {
      return {
        success: false,
        error: '아직 서버에 적용되지 않은 기능입니다. 마이그레이션 0114를 실행해야 동작합니다.',
      };
    }

    const message = error.message.includes('NOT_CREATE_REQUEST')
      ? '수정 요청은 그냥 「승인」을 쓰시면 됩니다. 서류 검사가 없습니다.'
      : error.message.includes('ALREADY_REVIEWED')
        ? '이미 처리된 신청입니다.'
        : error.message.includes('NOT_PLATFORM_ADMIN')
          ? '권한이 없습니다.'
          : '처리하지 못했습니다.';
    return { success: false, error: message };
  }

  revalidatePath('/admin/change-requests');
  revalidatePath(`/admin/change-requests/${requestId}`);
  revalidatePath('/admin/ga');
  revalidatePath('/partner');
  revalidatePath('/search');
  revalidatePath('/map');
  revalidatePath('/');
  return { success: true };
}
