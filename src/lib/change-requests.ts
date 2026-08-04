import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 지점 등록/수정 승인 큐(branch_registrations) 조회 - 관리자 검토 화면(/admin/change-requests)과
 * 파트너 이력(/partner/history)이 함께 사용한다. admin_users와 동일하게 branch_registrations도
 * RLS가 제출자 본인만 열어주므로, 여기서는 서비스롤 클라이언트로 전체를 조회한다(호출부가
 * requireAdmin()으로 이미 관리자 권한을 확인했다는 전제).
 */

export interface ChangeFieldDiff {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  kind?: 'text' | 'image';
}

export interface ChangeRequestListItem {
  id: string;
  targetType: 'ga_branch';
  targetId: string;
  targetName: string;
  gaCompanyId: string;
  gaCompanyName: string;
  requestType: 'create' | 'update';
  status: 'pending' | 'approved' | 'rejected';
  fieldChanges: ChangeFieldDiff[];
  submittedByName: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  reviewedByName: string | null;
}

export interface ChangeRequestDetail extends ChangeRequestListItem {
  action: 'create' | 'update';
  registrant: { name: string; title: string; phone: string; company: string; branchLabel: string };
  leaseContractUrl: string | null;
  businessCardUrl: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  name: '지점명',
  address: '주소',
  addressDetail: '상세주소',
  introText: '회사소개',
  educationInfo: '교육 안내',
  welfareInfo: '복지 안내',
  dbSupportInfo: 'DB지원 안내',
  settlementSupportInfo: '정착지원 안내',
  plannerCount: '설계사 수',
  parkingAvailable: '주차 가능',
  visitConsultAvailable: '방문상담 가능',
  businessHours: '운영시간',
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(없음)';
  if (typeof value === 'boolean') return value ? '가능' : '불가능';
  return String(value);
}

function buildFieldChanges(
  requestType: 'create' | 'update',
  payload: Record<string, unknown>,
  beforeSnapshot: Record<string, unknown>
): ChangeFieldDiff[] {
  if (requestType === 'create') {
    return [
      { field: '_create', label: '신규 등록', oldValue: '', newValue: `${payload.gaName ?? ''} · ${payload.branchName ?? ''}` },
    ];
  }

  const diffs: ChangeFieldDiff[] = [];
  for (const [payloadKey, label] of Object.entries(FIELD_LABELS)) {
    if (!(payloadKey in payload)) continue;
    const newValue = payload[payloadKey];
    const oldValue = beforeSnapshot[payloadKey];
    if (String(oldValue ?? '') === String(newValue ?? '')) continue;
    diffs.push({ field: payloadKey, label, oldValue: displayValue(oldValue), newValue: displayValue(newValue) });
  }
  return diffs;
}

async function toListItem(row: {
  id: string;
  request_type: 'create' | 'update';
  branch_id: string | null;
  ga_company_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  payload: Record<string, unknown>;
  before_snapshot: Record<string, unknown>;
  submitted_by_ga_admin_id: string;
  reviewed_by_admin_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  review_reason: string | null;
}): Promise<ChangeRequestListItem> {
  const admin = createAdminClient();
  const [{ data: branch }, { data: company }, { data: submittedBy }, { data: reviewedBy }] = await Promise.all([
    row.branch_id ? admin.from('ga_branch').select('name').eq('id', row.branch_id).maybeSingle() : Promise.resolve({ data: null }),
    row.ga_company_id ? admin.from('ga_company').select('name').eq('id', row.ga_company_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('ga_admin_users').select('display_name').eq('id', row.submitted_by_ga_admin_id).maybeSingle(),
    row.reviewed_by_admin_id
      ? admin.from('admin_users').select('display_name').eq('id', row.reviewed_by_admin_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: row.id,
    targetType: 'ga_branch',
    targetId: row.branch_id ?? '',
    targetName: branch?.name ?? (row.payload.branchName as string | undefined) ?? '알 수 없는 지점',
    gaCompanyId: row.ga_company_id ?? '',
    gaCompanyName: company?.name ?? (row.payload.gaName as string | undefined) ?? '알 수 없는 GA',
    requestType: row.request_type,
    status: row.status,
    fieldChanges: buildFieldChanges(row.request_type, row.payload, row.before_snapshot ?? {}),
    submittedByName: submittedBy?.display_name ?? '알 수 없음',
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
    reviewedByName: reviewedBy?.display_name ?? null,
  };
}

export async function listChangeRequests(
  options: {
    status?: 'pending' | 'approved' | 'rejected';
    requestType?: 'create' | 'update';
    gaCompanyId?: string;
  } = {}
): Promise<ChangeRequestListItem[]> {
  const admin = createAdminClient();
  // 관리자 화면은 임시저장(draft)을 절대 보지 않는다 - 파트너가 아직 제출하지 않은 초안이다.
  let query = admin.from('branch_registrations').select('*').neq('status', 'draft').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  if (options.requestType) query = query.eq('request_type', options.requestType);
  if (options.gaCompanyId) query = query.eq('ga_company_id', options.gaCompanyId);

  const { data, error } = await query;
  if (error || !data) return [];
  return Promise.all(data.map((row) => toListItem(row as Parameters<typeof toListItem>[0])));
}

export async function getChangeRequestDetail(id: string): Promise<ChangeRequestDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('branch_registrations').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const listItem = await toListItem(row as Parameters<typeof toListItem>[0]);

  let leaseContractUrl: string | null = null;
  let businessCardUrl: string | null = null;
  if (row.lease_contract_path) {
    const { data } = await admin.storage.from('branch-verification-docs').createSignedUrl(row.lease_contract_path, 600);
    leaseContractUrl = data?.signedUrl ?? null;
  }
  if (row.business_card_path) {
    const { data } = await admin.storage.from('branch-verification-docs').createSignedUrl(row.business_card_path, 600);
    businessCardUrl = data?.signedUrl ?? null;
  }

  return {
    ...listItem,
    action: row.request_type,
    registrant: {
      name: row.registrant_name,
      title: row.registrant_title,
      phone: row.registrant_phone,
      company: row.registrant_company,
      branchLabel: row.registrant_branch_label,
    },
    leaseContractUrl,
    businessCardUrl,
  };
}

export async function countPendingChangeRequests(gaCompanyId?: string): Promise<number> {
  const admin = createAdminClient();
  let query = admin.from('branch_registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  if (gaCompanyId) query = query.eq('ga_company_id', gaCompanyId);
  const { count } = await query;
  return count ?? 0;
}
