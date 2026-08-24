'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionResult = { success: true } | { success: false; error: string };

export type BranchManager = {
  gaAdminUserId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
};

/** 지점에 등록된 매니저 목록. 서버 컴포넌트에서 호출한다. */
export async function listBranchManagers(branchId: string): Promise<BranchManager[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ga_branch_admins')
    .select('ga_admin_user_id, created_at, ga_admin_users(email, display_name)')
    .eq('branch_id', branchId)
    .order('created_at');

  type Row = {
    ga_admin_user_id: string;
    created_at: string;
    ga_admin_users: { email: string | null; display_name: string | null } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    gaAdminUserId: r.ga_admin_user_id,
    email: r.ga_admin_users?.email ?? '(이메일 없음)',
    displayName: r.ga_admin_users?.display_name ?? null,
    createdAt: r.created_at,
  }));
}

/**
 * 이메일로 계정을 찾아 그 지점의 매니저로 등록한다.
 *
 * 🔴 없는 사람을 위해 빈 계정을 만들지 않는다. 본인이 먼저 보험맵에 가입해야 한다 —
 *    주인 없는 관리 권한을 만들지 않기 위해서다. 그래서 NO_SUCH_ACCOUNT를 그대로 안내한다.
 */
export async function grantBranchManagerAction(branchId: string, email: string): Promise<ActionResult> {
  const trimmed = email.trim();
  if (!trimmed) return { success: false, error: '이메일을 입력해주세요.' };

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('grant_branch_manager', {
    p_branch_id: branchId,
    p_email: trimmed,
  });

  if (error) {
    const m = error.message ?? '';
    // 🔴 분기하는 코드는 0115 정의에 실제로 있는 것만 쓴다. 상상해서 만들지 않는다.
    if (error.code === 'PGRST202' || /Could not find the function/i.test(m)) {
      return { success: false, error: '아직 서버에 적용되지 않은 기능입니다. 마이그레이션 0115를 실행해야 동작합니다.' };
    }
    if (m.includes('NO_SUCH_ACCOUNT')) {
      return {
        success: false,
        error: `${trimmed} 로 가입된 계정이 없습니다. 본인이 먼저 보험맵에 회원가입한 뒤 다시 등록해주세요.`,
      };
    }
    if (m.includes('BRANCH_NOT_FOUND')) return { success: false, error: '지점을 찾을 수 없습니다.' };
    if (m.includes('INVALID_INPUT')) return { success: false, error: '이메일을 확인해주세요.' };
    if (m.includes('NOT_PLATFORM_ADMIN')) return { success: false, error: '권한이 없습니다.' };
    return { success: false, error: '등록하지 못했습니다.' };
  }

  revalidatePath(`/admin/branches/${branchId}`);
  revalidatePath('/partner');
  return { success: true };
}

export async function revokeBranchManagerAction(branchId: string, gaAdminUserId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('revoke_branch_manager', {
    p_branch_id: branchId,
    p_ga_admin_user_id: gaAdminUserId,
  });
  if (error) {
    if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message ?? '')) {
      return { success: false, error: '아직 서버에 적용되지 않은 기능입니다. 마이그레이션 0115를 실행해야 동작합니다.' };
    }
    return { success: false, error: '해제하지 못했습니다.' };
  }
  revalidatePath(`/admin/branches/${branchId}`);
  revalidatePath('/partner');
  return { success: true };
}
