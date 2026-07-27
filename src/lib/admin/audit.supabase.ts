import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogItem {
  id: string;
  adminName: string;
  targetType: string;
  targetId: string;
  action: string;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  create: '생성',
  verify_toggle: '인증 배지 변경',
  set_approval_status: '승인 상태 변경',
  set_status: '노출 상태 변경',
  set_recommended: '추천 설정 변경',
};

const TARGET_LABEL: Record<string, string> = {
  ga_company: 'GA',
  ga_branch: '지점',
};

export function formatAuditAction(log: Pick<AuditLogItem, 'targetType' | 'action'>): string {
  const target = TARGET_LABEL[log.targetType] ?? log.targetType;
  const action = ACTION_LABEL[log.action] ?? log.action;
  return `${target} ${action}`;
}

export async function listRecentAuditLogs(limit = 10): Promise<AuditLogItem[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('id, target_type, target_id, action, created_at, admin_users:admin_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const admin = row.admin_users as unknown as { display_name: string } | null;
    return {
      id: row.id,
      adminName: admin?.display_name ?? '알 수 없음',
      targetType: row.target_type,
      targetId: row.target_id,
      action: row.action,
      createdAt: row.created_at,
    };
  });
}
