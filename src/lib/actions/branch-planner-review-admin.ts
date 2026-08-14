'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/session';
import type { ActionResult, PendingPlannerLink } from '@/lib/actions/branch-planner-review';

/**
 * 설계사 지점 연결 심사 - **운영팀(플랫폼 관리자) 예비 경로** (오너 지시 2026-08-14:
 * "지점관리자 계정 말고 운영자 계정으로도 확인할 수 있도록").
 *
 * 🔴 주체는 여전히 **지점 관리자**다(오너 확정 2026-08-13). 이 화면은 지점장이 계정을
 * 잃었거나 방치할 때 운영팀이 대신 처리하는 예비 경로이지, 주체를 옮기는 것이 아니다.
 *
 * 🔴 RPC는 손대지 않았다. `review_branch_planner_registration`(0112)의 플랫폼 관리자
 * 경로(`current_admin_id()`)가 **처음부터 열려 있다** - 막혀 있던 것은 ⓐ 목록을 읽을
 * 조회 경로(RLS가 지점 관리자용뿐)와 ⓑ admin 화면, 이 둘뿐이었다.
 *
 * ⚠️ 조회는 service role로 읽는다. RLS 정책을 새로 여는 대신, 이 저장소의 기존 패턴
 * (branch-planner-review.ts의 지점장 목록, my-branch-slot.ts)을 그대로 따른다 -
 * 호출부가 `requireAdmin()`으로 세션을 먼저 검증하고, 서버에서만 실행된다.
 * SQL 마이그레이션이 필요 없는 이유이기도 하다(오너가 실행할 SQL 없음).
 */
export async function listAllPlannerLinksAction(): Promise<PendingPlannerLink[]> {
  await requireAdmin();

  const admin = createAdminClient();

  // 운영팀은 전 지점을 본다(지점장 화면과 달리 GA로 좁히지 않는다).
  // 지점명은 소프트 삭제된 지점도 라벨은 보여야 하므로 deleted_at으로 거르지 않고
  // 라벨에만 표시한다 - 신청 행이 있는데 지점이 지워졌으면 그 사실 자체가 보여야 한다.
  const { data: rows } = await admin
    .from('branch_planner_registrations')
    .select('id, branch_id, name, job_title, status, review_reason, created_at')
    .order('created_at', { ascending: false });

  const branchIds = Array.from(new Set((rows ?? []).map((r) => r.branch_id)));
  const nameById = new Map<string, string>();
  if (branchIds.length > 0) {
    const { data: branches } = await admin
      .from('ga_branch')
      .select('id, name, deleted_at')
      .in('id', branchIds);
    for (const b of branches ?? []) {
      nameById.set(b.id, b.deleted_at ? `${b.name} (삭제된 지점)` : b.name);
    }
  }

  return (rows ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    branchName: nameById.get(r.branch_id) ?? '(지점 없음)',
    name: r.name,
    jobTitle: r.job_title,
    status: r.status as PendingPlannerLink['status'],
    reviewReason: r.review_reason,
    createdAt: r.created_at,
  }));
}

/**
 * 운영팀 심사 처리. 권한 검사는 RPC(0112)가 한다 - `current_admin_id()`가 null이면
 * (관리자가 아니면) 지점 관리자 검사로 넘어가고 거기서도 아니면 막힌다.
 */
export async function adminReviewPlannerLinkAction(
  registrationId: string,
  decision: 'approved' | 'on_hold' | 'rejected' | 'pending_review',
  reason?: string
): Promise<ActionResult> {
  await requireAdmin();

  if ((decision === 'on_hold' || decision === 'rejected') && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요. 신청자에게 그대로 전달됩니다.' };
  }

  // 🔴 service role이 아니라 **관리자 본인 세션**으로 RPC를 부른다 - RPC가
  // auth.uid() → current_admin_id()로 관리자임을 스스로 확인한다(쓰기는 RPC-only 원칙).
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('review_branch_planner_registration', {
    p_registration_id: registrationId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin/planner-links');
  // 지점장 화면과 신청자 홈 슬롯도 같은 데이터를 본다.
  revalidatePath('/partner/planner-links');
  revalidatePath('/');
  return { success: true };
}
