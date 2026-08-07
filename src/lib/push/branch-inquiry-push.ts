import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendExpoPushToUsers } from '@/lib/push/expo';

/** W-040 - 지점 문의(W-059)가 들어오면 그 지점 소속 GA 관리자 전원에게 즉시 푸시한다.
 * 문구는 "여는 알림 4요소"(APP_GROWTH_PLAN §4.5)를 전부 채운다: 내 것(지점명) ·
 * 숫자(1건) · 방금(지금 막) · 행동(눌러서 확인 - 성과 화면 딥링크). */
export async function notifyBranchOwnerOfInquiry(branchId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: branch } = await admin.from('ga_branch').select('name, ga_company_id').eq('id', branchId).maybeSingle();
    if (!branch) return;

    const { data: admins } = await admin
      .from('ga_admin_users')
      .select('auth_user_id')
      .eq('ga_company_id', branch.ga_company_id)
      .eq('is_active', true);
    if (!admins || admins.length === 0) return;

    await sendExpoPushToUsers(
      admins.map((a) => a.auth_user_id),
      {
        title: `${branch.name}에 새 문의가 도착했어요`,
        body: '방금 문의 1건이 접수됐습니다. 눌러서 확인해보세요.',
        data: { path: `/partner/branches/${branchId}/performance` },
      }
    );
  } catch (error) {
    // 푸시 실패가 문의 접수 자체를 막으면 안 된다 - 호출부(submitBranchInquiryAction)는
    // 이 함수의 결과를 기다리지 않는다.
    console.error('[branch-inquiry-push] 발송 실패:', error);
  }
}
