import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlannerBadgeStatus } from '@/types/database';

export interface PlannerBadgeTypeItem {
  code: string;
  label: string;
  icon: string;
  description: string | null;
  requiresDocument: boolean;
  selfApplicable: boolean;
}

/** 배지 카탈로그 전체 조회(비활성 포함) - 관리자 화면(수동 부여 선택 목록)에서 사용. */
export async function listPlannerBadgeTypes(): Promise<PlannerBadgeTypeItem[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('planner_badge_types').select('*').order('sort_order', { ascending: true });
  return (data ?? []).map((row) => ({
    code: row.code,
    label: row.label,
    icon: row.icon,
    description: row.description,
    requiresDocument: row.requires_document,
    selfApplicable: row.self_applicable,
  }));
}

export interface PlannerBadgeListItem {
  id: string;
  plannerProfileId: string;
  plannerName: string;
  badgeTypeCode: string;
  badgeLabel: string;
  badgeIcon: string;
  status: PlannerBadgeStatus;
  createdAt: string;
}

/** 배지 신청/부여 전체 조회 - 자가신청(연봉인증)뿐 아니라 관리자가 수동 부여한 것도 함께 보인다. */
export async function listPlannerBadges(options: { status?: PlannerBadgeStatus } = {}): Promise<PlannerBadgeListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('planner_badges').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];

  const profileIds = Array.from(new Set(data.map((r) => r.planner_profile_id)));
  const badgeCodes = Array.from(new Set(data.map((r) => r.badge_type_code)));
  const [{ data: profiles }, { data: badgeTypes }] = await Promise.all([
    profileIds.length > 0 ? admin.from('planner_profiles').select('id, name').in('id', profileIds) : Promise.resolve({ data: [] }),
    badgeCodes.length > 0 ? admin.from('planner_badge_types').select('code, label, icon').in('code', badgeCodes) : Promise.resolve({ data: [] }),
  ]);
  const nameByProfileId = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const typeByCode = new Map((badgeTypes ?? []).map((t) => [t.code, t]));

  return data.map((row) => ({
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    plannerName: nameByProfileId.get(row.planner_profile_id) ?? '알 수 없음',
    badgeTypeCode: row.badge_type_code,
    badgeLabel: typeByCode.get(row.badge_type_code)?.label ?? row.badge_type_code,
    badgeIcon: typeByCode.get(row.badge_type_code)?.icon ?? '',
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function countPendingPlannerBadges(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin.from('planner_badges').select('id', { count: 'exact', head: true }).eq('status', 'pending_review');
  return count ?? 0;
}

export interface PlannerBadgeDetail extends PlannerBadgeListItem {
  documentUrl: string | null;
  reviewReason: string | null;
  grantedAt: string | null;
}

export async function getPlannerBadgeDetail(id: string): Promise<PlannerBadgeDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('planner_badges').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [{ data: profile }, { data: badgeType }, { data: doc }] = await Promise.all([
    admin.from('planner_profiles').select('name').eq('id', row.planner_profile_id).maybeSingle(),
    admin.from('planner_badge_types').select('label, icon').eq('code', row.badge_type_code).maybeSingle(),
    admin
      .from('verification_documents')
      .select('storage_path')
      .eq('owner_type', 'planner_badge')
      .eq('owner_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let documentUrl: string | null = null;
  if (doc?.storage_path) {
    const { data: signed } = await admin.storage.from('planner-market-income-docs').createSignedUrl(doc.storage_path, 600);
    documentUrl = signed?.signedUrl ?? null;
  }

  return {
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    plannerName: profile?.name ?? '알 수 없음',
    badgeTypeCode: row.badge_type_code,
    badgeLabel: badgeType?.label ?? row.badge_type_code,
    badgeIcon: badgeType?.icon ?? '',
    status: row.status,
    createdAt: row.created_at,
    documentUrl,
    reviewReason: row.review_reason,
    grantedAt: row.granted_at,
  };
}
