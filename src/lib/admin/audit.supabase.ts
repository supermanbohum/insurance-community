import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogItem {
  id: string;
  adminName: string;
  targetType: string;
  targetId: string;
  action: string;
  reasonDetail: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  create: '생성',
  verify_toggle: '인증 배지 변경',
  set_approval_status: '승인 상태 변경',
  set_status: '노출 상태 변경',
  set_recommended: '추천 설정 변경',
  credit_grant: '열람권 지급',
  credit_deduct: '열람권 차감',
  visitor_adjustment_set: '방문자수 보정',
  post_status_change: '게시글 상태 변경',
  notice_set: '공지 등록',
  notice_unset: '공지 해제',
  best_set: '베스트 등록',
  best_unset: '베스트 해제',
  comment_status_change: '댓글 상태 변경',
  user_blocked: '회원 차단',
  user_unblocked: '회원 차단 해제',
  report_resolved: '신고 처리',
};

const TARGET_LABEL: Record<string, string> = {
  ga_company: 'GA',
  ga_branch: '지점',
  planner_market_credit: '열람권',
  site_visit_adjustment: '방문자수',
  post: '게시글',
  comment: '댓글',
  user_block: '회원',
  report: '신고',
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
    .select('id, target_type, target_id, action, reason_detail, created_at, admin_users:admin_id(display_name)')
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
      reasonDetail: row.reason_detail,
      createdAt: row.created_at,
    };
  });
}

export interface AuditLogPage {
  items: AuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** 관리자 작업 로그 전체 조회 페이지 전용 - 페이지네이션 지원. */
export async function listAuditLogsPage(page = 1, pageSize = 30): Promise<AuditLogPage> {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from('audit_logs')
    .select('id, target_type, target_id, action, reason_detail, created_at, admin_users:admin_id(display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const items = (data ?? []).map((row) => {
    const admin = row.admin_users as unknown as { display_name: string } | null;
    return {
      id: row.id,
      adminName: admin?.display_name ?? '알 수 없음',
      targetType: row.target_type,
      targetId: row.target_id,
      action: row.action,
      reasonDetail: row.reason_detail,
      createdAt: row.created_at,
    };
  });

  return { items, totalCount: count ?? 0, page, pageSize };
}
