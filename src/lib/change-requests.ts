import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { ChangeFieldDiff, ChangeRequestStatus, ChangeRequestTargetType } from '@/lib/mock/store';

/**
 * GA/지점 변경요청 조회. 관리자 검토 큐(/admin/change-requests)와 파트너 이력(/partner/history)이
 * 함께 사용한다. 지금은 Mock 전용 구현만 있다 - 실제 Supabase를 붙일 때 이 파일을
 * change-requests.mock.ts/change-requests.supabase.ts로 나누면 된다.
 */

export interface ChangeRequestListItem {
  id: string;
  targetType: ChangeRequestTargetType;
  targetId: string;
  targetName: string;
  gaCompanyId: string;
  gaCompanyName: string;
  status: ChangeRequestStatus;
  fieldChanges: ChangeFieldDiff[];
  submittedByName: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  reviewedByName: string | null;
}

export interface ChangeRequestDetail extends ChangeRequestListItem {
  action: 'create' | 'update';
}

function targetName(targetType: ChangeRequestTargetType, targetId: string, gaCompanyName: string): string {
  if (targetType === 'ga_company') return gaCompanyName;
  const branch = mockStore.branches.find((b) => b.id === targetId);
  return branch?.name ?? '알 수 없는 지점';
}

function toListItem(request: (typeof mockStore.changeRequests)[number]): ChangeRequestListItem {
  const company = mockStore.gaCompanies.find((c) => c.id === request.ga_company_id);
  const submittedBy = mockStore.gaAdminUsers.find((g) => g.id === request.submitted_by_ga_admin_id);
  const reviewedBy = request.reviewed_by_admin_id
    ? mockStore.adminUsers.find((a) => a.id === request.reviewed_by_admin_id)
    : null;
  return {
    id: request.id,
    targetType: request.target_type,
    targetId: request.target_id,
    targetName: targetName(request.target_type, request.target_id, company?.name ?? '알 수 없는 GA'),
    gaCompanyId: request.ga_company_id,
    gaCompanyName: company?.name ?? '알 수 없는 GA',
    status: request.status,
    fieldChanges: request.field_changes,
    submittedByName: submittedBy?.display_name ?? '알 수 없음',
    createdAt: request.created_at,
    reviewedAt: request.reviewed_at,
    reviewReason: request.review_reason,
    reviewedByName: reviewedBy?.display_name ?? null,
  };
}

export async function listChangeRequests(options: {
  status?: ChangeRequestStatus;
  gaCompanyId?: string;
} = {}): Promise<ChangeRequestListItem[]> {
  let list = [...mockStore.changeRequests];
  if (options.status) list = list.filter((r) => r.status === options.status);
  if (options.gaCompanyId) list = list.filter((r) => r.ga_company_id === options.gaCompanyId);
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return list.map(toListItem);
}

export async function getChangeRequestDetail(id: string): Promise<ChangeRequestDetail | null> {
  const request = mockStore.changeRequests.find((r) => r.id === id);
  if (!request) return null;
  return {
    ...toListItem(request),
    action: request.action,
  };
}

export async function countPendingChangeRequests(gaCompanyId?: string): Promise<number> {
  return mockStore.changeRequests.filter(
    (r) => r.status === 'pending' && (!gaCompanyId || r.ga_company_id === gaCompanyId)
  ).length;
}
