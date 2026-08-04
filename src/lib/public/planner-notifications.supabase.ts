import { createServerSupabaseClient } from '@/lib/supabase/server';

/** 설계사 열람 알림 - RLS로 본인 것만 보이므로 세션 클라이언트로 조회한다(관리자 클라이언트 불필요). */

export interface PlannerContactViewNotification {
  id: string;
  branchId: string | null;
  branchSlug: string | null;
  branchName: string | null;
  branchRegionLabel: string | null;
  gaCompanyName: string | null;
  createdAt: string;
  readAt: string | null;
}

export async function listMyPlannerContactNotifications(): Promise<PlannerContactViewNotification[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('list_my_planner_contact_notifications');
  return (data ?? []).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    branchSlug: row.branch_slug,
    branchName: row.branch_name,
    branchRegionLabel: row.branch_region_label,
    gaCompanyName: row.ga_company_name,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

export async function countMyUnreadPlannerContactNotifications(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('count_my_unread_planner_contact_notifications');
  return data ?? 0;
}
