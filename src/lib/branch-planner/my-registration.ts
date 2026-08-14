import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type BranchPlannerRegistrationStatus = 'pending_review' | 'on_hold' | 'rejected' | 'approved';

export interface MyBranchPlannerRegistration {
  id: string;
  status: BranchPlannerRegistrationStatus;
  /** 보류·반려 사유. 심사 RPC가 두 결정에서 **필수 입력**으로 받는다(0112). */
  reason: string | null;
  branchId: string;
  branchName: string | null;
  branchSlug: string | null;
  createdAt: string;
}

/**
 * 로그인한 본인의 **가장 최근** 지점 연결 신청 1건.
 *
 * ---------------------------------------------------------------------------
 * 🔴 왜 필요한가 - 승인 결과가 신청자에게 도달하지 않았다 (2026-08-13)
 * ---------------------------------------------------------------------------
 * `review_branch_planner_registration`(0112)으로 지점 관리자가 승인/보류/반려를 처리할 수
 * 있게 됐지만, **신청자에게 알릴 수단이 없다.** 외부 채널(알림톡)은 오너 판단으로 보류다.
 * 그래서 「보낸다」 대신 **신청자가 이미 가는 화면에서 스스로 볼 수 있게** 한다.
 *
 * 🔴 「승인되면 알려드립니다」류 문구는 절대 쓰지 않는다 - 보낼 수단이 없는 약속이다.
 * 대신 「여기에서 상태를 확인할 수 있습니다」라고 쓴다(화면 상태 서술이라 항상 참이다).
 *
 * ⚠️ 관리자 클라이언트를 쓰는 이유: `branch_planner_registrations`의 SELECT 정책은
 * 지점 관리자용(`is_ga_admin_for_branch`)이라 **신청자 본인은 자기 행을 못 읽는다.**
 * 여기서는 서버에서 `auth.uid()`로 확인한 본인 행 1건만 좁혀 읽는다(my-branch-slot.ts와
 * 같은 방식). RLS를 새로 여는 것보다 읽는 자리를 좁게 유지하는 쪽이 안전하다.
 *
 * ⚠️ `public.users`의 조인 키는 `auth_user_id`다. `users.id`로 조인하면 에러 없이
 * 그럴듯하게 틀린 결과가 나온다(session.supabase.ts와 동일한 함정).
 */
export async function getMyBranchPlannerRegistration(): Promise<MyBranchPlannerRegistration | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: appUser } = await admin
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!appUser) return null;

  // 반려 뒤 재신청하면 행이 하나 더 생긴다 - **가장 최근 행**만 본다.
  // 옛 반려 행이 남아 있다고 지금도 반려 상태인 것은 아니다(my-branch-slot.ts와 같은 규칙).
  const { data: row } = await admin
    .from('branch_planner_registrations')
    .select('id, status, review_reason, branch_id, created_at')
    .eq('user_id', appUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return null;

  const { data: branch } = await admin
    .from('ga_branch')
    .select('name, slug, deleted_at')
    .eq('id', row.branch_id)
    .is('deleted_at', null)
    .maybeSingle();

  return {
    id: row.id,
    status: row.status as BranchPlannerRegistrationStatus,
    reason: row.review_reason,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    branchSlug: branch?.slug ?? null,
    createdAt: row.created_at,
  };
}
