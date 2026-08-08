import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendExpoPushToUsers } from '@/lib/push/expo';

/** 신규 등록 접수 시 운영팀에게 즉시 알림(W-086) - admin_users도 auth.users 계정을
 * 그대로 갖고 있어서 기존 push_tokens/sendExpoPushToUsers를 그대로 재사용한다(관리자
 * 전용 토큰 테이블을 새로 만들 필요가 없었다). 개인정보(등록자명·연락처)는 잠금화면에
 * 노출될 수 있으니 절대 넣지 않고 "새 OO 등록 1건" 수준만 보낸다. */
async function notifyAdmins(title: string, body: string): Promise<void> {
  const admin = createAdminClient();
  const { data: admins } = await admin.from('admin_users').select('auth_user_id').eq('is_active', true);
  const authUserIds = (admins ?? []).map((a) => a.auth_user_id);
  if (authUserIds.length === 0) return;
  await sendExpoPushToUsers(authUserIds, { title, body });
}

export async function notifyAdminsOfNewBranchRegistration(): Promise<void> {
  await notifyAdmins('새 지점 등록 접수', '새 지점 등록 신청이 접수되었습니다. 승인 대기 목록을 확인해주세요.');
}

export async function notifyAdminsOfNewPlannerRegistration(): Promise<void> {
  await notifyAdmins('새 설계사 등록 접수', '새 설계사 등록 신청이 접수되었습니다. 승인 대기 목록을 확인해주세요.');
}
