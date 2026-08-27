'use server';

import { revalidatePath } from 'next/cache';
import { requirePartner } from '@/lib/partner/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { success: false; error: string };

export type PartnerBranchManager = {
  gaAdminUserId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
};

/**
 * 지점 관리자가 **자기 지점의** 매니저를 직접 관리한다. 운영진 승인 없이 즉시 적용된다.
 *
 * 🔴 왜 승인을 안 두나(오너 2026-08-24): 자기 지점에 자기가 쓸 사람을 넣는 일이라
 *    운영팀이 판단할 근거가 없다. 승인을 두면 사람이 바뀔 때마다 **운영팀이 병목**이 되고,
 *    결국 「막혔다」는 연락을 다시 받는다. 대신 누가 누구를 넣었는지 감사 로그에 남는다.
 *
 * 권한 판정은 0116 RPC가 한다(is_ga_admin_for_branch). 여기서 따로 비교하지 않는다 —
 * 판정이 두 군데면 반드시 어긋난다(2026-08-24에 실제로 그랬다).
 */
export async function listMyBranchManagers(branchId: string): Promise<PartnerBranchManager[]> {
  // 🔴 여기서 예외가 새어 나가면 **지점 편집 페이지 전체가 죽는다.**
  //    실제 사고(2026-08-27): 마이그레이션에서 list_branch_managers 를 빠뜨려 RPC가 404였고,
  //    지점 관리자가 사진을 저장하다 「일시적인 오류가 발생했습니다」를 반복해서 맞았다.
  //    매니저 목록은 **부가 기능**이다. 이것 때문에 사진·연락처 편집이 막히면 안 된다.
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc('list_branch_managers', { p_branch_id: branchId });
    if (error || !data) return [];
    type Row = { ga_admin_user_id: string; email: string; display_name: string | null; created_at: string };
    return (data as unknown as Row[]).map((r) => ({
      gaAdminUserId: r.ga_admin_user_id,
      email: r.email,
      displayName: r.display_name,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

function mapError(error: { code?: string; message?: string } | null, email?: string): string {
  const m = error?.message ?? '';
  if (error?.code === 'PGRST202' || /Could not find the function/i.test(m)) {
    return '아직 서버에 적용되지 않은 기능입니다. 마이그레이션 0116을 실행해야 동작합니다.';
  }
  if (m.includes('NO_SUCH_ACCOUNT')) {
    return `${email ?? '해당 이메일'}로 가입된 보험맵 계정이 없습니다. 그분이 먼저 회원가입한 뒤 다시 등록해주세요.`;
  }
  if (m.includes('NOT_AUTHORIZED_FOR_BRANCH')) return '이 지점의 매니저를 관리할 권한이 없습니다.';
  if (m.includes('BRANCH_NOT_FOUND')) return '지점을 찾을 수 없습니다.';
  if (m.includes('INVALID_INPUT')) return '이메일을 확인해주세요.';
  return '처리하지 못했습니다.';
}

export async function addMyBranchManagerAction(branchId: string, email: string): Promise<ActionResult> {
  const trimmed = email.trim();
  if (!trimmed) return { success: false, error: '이메일을 입력해주세요.' };

  await requirePartner();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('grant_branch_manager', {
    p_branch_id: branchId,
    p_email: trimmed,
  });
  if (error) return { success: false, error: mapError(error, trimmed) };

  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath('/partner');
  return { success: true };
}

export async function removeMyBranchManagerAction(branchId: string, gaAdminUserId: string): Promise<ActionResult> {
  await requirePartner();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('revoke_branch_manager', {
    p_branch_id: branchId,
    p_ga_admin_user_id: gaAdminUserId,
  });
  if (error) return { success: false, error: mapError(error) };

  revalidatePath(`/partner/branches/${branchId}`);
  revalidatePath('/partner');
  return { success: true };
}
