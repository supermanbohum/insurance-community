'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePartner } from '@/lib/partner/session';

export type ActionResult = { success: true } | { success: false; error: string };

export interface PendingPlannerLink {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  jobTitle: string;
  status: 'pending_review' | 'on_hold' | 'rejected' | 'approved';
  reviewReason: string | null;
  createdAt: string;
}

/**
 * 지점 관리자가 처리할 「설계사 지점 연결」 신청 목록.
 *
 * 🔴 이 화면이 없어서 [실측 2026-08-13] pending_review 5건이 무기한 쌓여 있었다.
 * RPC(`admin_review_branch_planner_registration`)는 있었는데 **호출부가 0건**이었다 -
 * 만들어 두고 배선을 안 한 상태였고, 신청자에게는 「승인이 안 난다」로만 보였다.
 *
 * 🔴 승인 주체는 **해당 지점 관리자**다(오너 확정 2026-08-13). 운영팀이 아니다 -
 * 지점장이 자기 지점 소속 설계사를 가장 잘 알고, 운영팀은 그 관계를 확인할 방법이 없다.
 *
 * ⚠️ service role로 읽는다. 0111이 지점 관리자용 SELECT 정책을 열어 두었지만, 이
 * 화면은 서버에서만 렌더되고 아래에서 **소유 지점으로 직접 좁히므로** 정책에 기대지
 * 않는다 - 정책이 나중에 바뀌어도 이 화면의 범위는 코드가 보장한다.
 */
export async function listPendingPlannerLinksAction(): Promise<PendingPlannerLink[]> {
  const partner = await requirePartner();
  if (!partner.ga_company_id) return [];

  const admin = createAdminClient();

  // 🔴 내 GA의 지점만. 지점 목록을 먼저 좁히고 그 안에서만 신청을 읽는다.
  const { data: branches } = await admin
    .from('ga_branch')
    .select('id, name')
    .eq('ga_company_id', partner.ga_company_id)
    .is('deleted_at', null);

  const branchIds = (branches ?? []).map((b) => b.id);
  if (branchIds.length === 0) return [];
  const nameById = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const { data } = await admin
    .from('branch_planner_registrations')
    .select('id, branch_id, name, job_title, status, review_reason, created_at')
    .in('branch_id', branchIds)
    .order('created_at', { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    branchName: nameById.get(r.branch_id) ?? '',
    name: r.name,
    jobTitle: r.job_title,
    status: r.status as PendingPlannerLink['status'],
    reviewReason: r.review_reason,
    createdAt: r.created_at,
  }));
}

/**
 * 승인·보류·반려·되돌리기. 권한 검사는 RPC(0111)가 한다 - 자기 지점이 아니면
 * NOT_GA_ADMIN_FOR_BRANCH로 막힌다.
 *
 * 🔴 보류·반려는 사유가 필수다. 신청자가 무엇을 고쳐야 하는지 알아야 한다(RPC도
 * REASON_REQUIRED로 막지만, 여기서 먼저 거르면 사용자가 즉시 안다).
 */
export async function reviewPlannerLinkAction(
  registrationId: string,
  decision: 'approved' | 'on_hold' | 'rejected' | 'pending_review',
  reason?: string
): Promise<ActionResult> {
  await requirePartner();

  if ((decision === 'on_hold' || decision === 'rejected') && !reason?.trim()) {
    return { success: false, error: '사유를 입력해주세요. 신청자에게 그대로 전달됩니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('review_branch_planner_registration', {
    p_registration_id: registrationId,
    p_decision: decision,
    p_reason: reason?.trim() || undefined,
  });

  if (error) {
    return { success: false, error: '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/partner/planner-links');
  revalidatePath('/partner');
  // 승인되면 그 설계사의 홈 슬롯이 「우리 지점 보기」로 바뀐다(SPEC-042).
  revalidatePath('/');
  return { success: true };
}
