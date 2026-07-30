import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface GaChangeRequestListItem {
  id: string;
  userId: string;
  memberName: string;
  memberUsername: string | null;
  currentGaName: string | null;
  requestedGaName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewReason: string | null;
  createdAt: string;
}

async function toListItem(row: {
  id: string;
  user_id: string;
  current_ga_company_id: string | null;
  requested_ga_company_id: string;
  status: 'pending' | 'approved' | 'rejected';
  review_reason: string | null;
  created_at: string;
}): Promise<GaChangeRequestListItem> {
  const admin = createAdminClient();
  const [{ data: member }, { data: currentGa }, { data: requestedGa }] = await Promise.all([
    admin.from('users').select('nickname, username').eq('id', row.user_id).maybeSingle(),
    row.current_ga_company_id
      ? admin.from('ga_company').select('name').eq('id', row.current_ga_company_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('ga_company').select('name').eq('id', row.requested_ga_company_id).maybeSingle(),
  ]);

  return {
    id: row.id,
    userId: row.user_id,
    memberName: member?.nickname ?? '알 수 없음',
    memberUsername: member?.username ?? null,
    currentGaName: currentGa?.name ?? null,
    requestedGaName: requestedGa?.name ?? '알 수 없는 GA',
    status: row.status,
    reviewReason: row.review_reason,
    createdAt: row.created_at,
  };
}

export async function listGaChangeRequests(options: { status?: 'pending' | 'approved' | 'rejected' } = {}): Promise<GaChangeRequestListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('user_ga_change_requests').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];
  return Promise.all(data.map((row) => toListItem(row)));
}

export async function countPendingGaChangeRequests(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin.from('user_ga_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  return count ?? 0;
}

export interface GaChangeRequestDetail extends GaChangeRequestListItem {
  memberEmail: string | null;
  memberContact: string | null;
}

export async function getGaChangeRequestDetail(id: string): Promise<GaChangeRequestDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('user_ga_change_requests').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [listItem, { data: member }] = await Promise.all([
    toListItem(row),
    admin.from('users').select('email, contact').eq('id', row.user_id).maybeSingle(),
  ]);

  return {
    ...listItem,
    memberEmail: member?.email ?? null,
    memberContact: member?.contact ?? null,
  };
}
