import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const REMINDER_AFTER_DAYS = 3;

export interface StaleIncompleteRegistration {
  registrationId: string;
  branchId: string;
  branchName: string;
  authUserId: string;
}

/** W-087④ - 사진 없이 저장된(status='incomplete') 등록 중 REMINDER_AFTER_DAYS일
 * 이상 방치되고 아직 리마인드를 보낸 적 없는 건만 반환한다(0076의
 * incomplete_reminder_sent_at으로 중복발송 방지 - 크론이 매일 돌기 때문에 이 값이
 * 없으면 같은 사람에게 매일 보내게 된다). */
export async function getStaleIncompleteRegistrations(): Promise<StaleIncompleteRegistration[]> {
  const admin = createAdminClient();
  const threshold = new Date(Date.now() - REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: registrations } = await admin
    .from('branch_registrations')
    .select('id, branch_id, submitted_by_ga_admin_id')
    .eq('status', 'incomplete')
    .is('incomplete_reminder_sent_at', null)
    .lte('updated_at', threshold);
  if (!registrations || registrations.length === 0) return [];

  const branchIds = registrations.map((r) => r.branch_id).filter((id): id is string => Boolean(id));
  const adminIds = [...new Set(registrations.map((r) => r.submitted_by_ga_admin_id))];

  const [{ data: branches }, { data: admins }] = await Promise.all([
    admin.from('ga_branch').select('id, name').in('id', branchIds),
    admin.from('ga_admin_users').select('id, auth_user_id').in('id', adminIds).eq('is_active', true),
  ]);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const authUserIdByAdminId = new Map((admins ?? []).map((a) => [a.id, a.auth_user_id]));

  const result: StaleIncompleteRegistration[] = [];
  for (const r of registrations) {
    if (!r.branch_id) continue;
    const authUserId = authUserIdByAdminId.get(r.submitted_by_ga_admin_id);
    if (!authUserId) continue;
    result.push({
      registrationId: r.id,
      branchId: r.branch_id,
      branchName: branchNameById.get(r.branch_id) ?? '지점',
      authUserId,
    });
  }
  return result;
}

export async function markIncompleteReminderSent(registrationId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('branch_registrations').update({ incomplete_reminder_sent_at: new Date().toISOString() }).eq('id', registrationId);
}
