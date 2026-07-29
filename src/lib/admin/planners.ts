import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { derivePlannerDisplayStatus } from '@/lib/planners/tier';
import type { PlannerCertificationStatus, PlannerIncomeTier } from '@/types/database';

export interface PlannerCertificationListItem {
  id: string;
  plannerName: string;
  plannerPhone: string;
  plannerCompany: string;
  jobTitle: string;
  incomeTier: PlannerIncomeTier;
  status: PlannerCertificationStatus;
  displayStatus: ReturnType<typeof derivePlannerDisplayStatus>;
  branchId: string;
  branchName: string;
  gaCompanyName: string;
  approvedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PlannerCertificationHistoryItem {
  id: string;
  eventType: 'initial_approval' | 'renewal_approval' | 'rejection';
  incomeTier: PlannerIncomeTier;
  approvedByName: string | null;
  approvalMemo: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface PlannerCertificationDetail extends PlannerCertificationListItem {
  submittedByName: string;
  withholdingDocUrl: string | null;
  history: PlannerCertificationHistoryItem[];
}

async function toListItem(row: {
  id: string;
  planner_name: string;
  planner_phone: string;
  planner_company: string;
  job_title: string;
  income_tier: PlannerIncomeTier;
  status: PlannerCertificationStatus;
  branch_id: string;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
}): Promise<PlannerCertificationListItem> {
  const admin = createAdminClient();
  const { data: branch } = await admin
    .from('ga_branch')
    .select('name, ga_company:ga_company_id(name)')
    .eq('id', row.branch_id)
    .maybeSingle();
  const gaCompany = branch?.ga_company as unknown as { name: string } | null;

  return {
    id: row.id,
    plannerName: row.planner_name,
    plannerPhone: row.planner_phone,
    plannerCompany: row.planner_company,
    jobTitle: row.job_title,
    incomeTier: row.income_tier,
    status: row.status,
    displayStatus: derivePlannerDisplayStatus(row.status, row.expires_at),
    branchId: row.branch_id,
    branchName: branch?.name ?? '알 수 없는 지점',
    gaCompanyName: gaCompany?.name ?? '알 수 없는 GA',
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function listPlannerCertifications(options: { status?: PlannerCertificationStatus } = {}): Promise<PlannerCertificationListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('planner_certifications').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];
  return Promise.all(data.map((row) => toListItem(row)));
}

export async function countPendingPlannerCertifications(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('planner_certifications')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending_review', 'pending_renewal']);
  return count ?? 0;
}

export async function getPlannerCertificationDetail(id: string): Promise<PlannerCertificationDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('planner_certifications').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [listItem, { data: submittedBy }, { data: doc }, { data: historyRows }] = await Promise.all([
    toListItem(row),
    admin.from('ga_admin_users').select('display_name').eq('id', row.submitted_by_ga_admin_id).maybeSingle(),
    admin
      .from('verification_documents')
      .select('storage_path')
      .eq('owner_type', 'planner_certification')
      .eq('owner_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('planner_certification_history').select('*').eq('certification_id', id).order('created_at', { ascending: false }),
  ]);

  let withholdingDocUrl: string | null = null;
  if (doc?.storage_path) {
    const { data: signed } = await admin.storage.from('planner-verification-docs').createSignedUrl(doc.storage_path, 600);
    withholdingDocUrl = signed?.signedUrl ?? null;
  }

  const adminIds = Array.from(new Set((historyRows ?? []).map((h) => h.approved_by_admin_id).filter((v): v is string => Boolean(v))));
  const { data: adminRows } = adminIds.length > 0 ? await admin.from('admin_users').select('id, display_name').in('id', adminIds) : { data: [] };
  const adminNameById = new Map((adminRows ?? []).map((a) => [a.id, a.display_name]));

  const history: PlannerCertificationHistoryItem[] = (historyRows ?? []).map((h) => ({
    id: h.id,
    eventType: h.event_type,
    incomeTier: h.income_tier,
    approvedByName: h.approved_by_admin_id ? (adminNameById.get(h.approved_by_admin_id) ?? null) : null,
    approvalMemo: h.approval_memo,
    effectiveFrom: h.effective_from,
    effectiveUntil: h.effective_until,
  }));

  return {
    ...listItem,
    submittedByName: submittedBy?.display_name ?? '알 수 없음',
    withholdingDocUrl,
    history,
  };
}
