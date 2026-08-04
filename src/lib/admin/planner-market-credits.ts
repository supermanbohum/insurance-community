import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CreditPurchaseTierCode, CreditPurchaseStatus } from '@/types/database';

async function gaCompanyNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const admin = createAdminClient();
  const { data } = await admin.from('ga_company').select('id, name').in('id', Array.from(new Set(ids)));
  return new Map((data ?? []).map((c) => [c.id, c.name]));
}

export interface CreditPurchaseListItem {
  id: string;
  gaCompanyId: string;
  gaCompanyName: string;
  tierCode: CreditPurchaseTierCode;
  creditCount: number;
  amountKrw: number;
  status: CreditPurchaseStatus;
  paymentMethod: string | null;
  refundReason: string | null;
  createdAt: string;
}

/** 관리자용 열람권 구매내역 전체 조회 - 회사명 조인 포함. */
export async function listPlannerMarketCreditPurchases(): Promise<CreditPurchaseListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('planner_market_credit_purchases').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  const nameByCompanyId = await gaCompanyNames(data.map((r) => r.ga_company_id));

  return data.map((row) => ({
    id: row.id,
    gaCompanyId: row.ga_company_id,
    gaCompanyName: nameByCompanyId.get(row.ga_company_id) ?? '알 수 없는 GA',
    tierCode: row.tier_code,
    creditCount: row.credit_count,
    amountKrw: row.amount_krw,
    status: row.status,
    paymentMethod: row.payment_method,
    refundReason: row.refund_reason,
    createdAt: row.created_at,
  }));
}

export interface CreditBalanceListItem {
  gaCompanyId: string;
  gaCompanyName: string;
  balance: number;
  updatedAt: string;
}

/** 관리자용 GA사별 남은 열람권 조회. */
export async function listPlannerMarketCreditBalances(): Promise<CreditBalanceListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('planner_market_credit_balances').select('*').order('balance', { ascending: false });
  if (!data) return [];
  const nameByCompanyId = await gaCompanyNames(data.map((r) => r.ga_company_id));

  return data.map((row) => ({
    gaCompanyId: row.ga_company_id,
    gaCompanyName: nameByCompanyId.get(row.ga_company_id) ?? '알 수 없는 GA',
    balance: row.balance,
    updatedAt: row.updated_at,
  }));
}

export interface CreditUnlockListItem {
  id: string;
  gaCompanyId: string;
  gaCompanyName: string;
  plannerProfileId: string;
  plannerName: string;
  createdAt: string;
}

/** 관리자용 열람내역(어느 GA가 어느 설계사를 언제 열람했는지) 전체 조회. */
export async function listPlannerMarketCreditUnlocks(): Promise<CreditUnlockListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('planner_market_credit_unlocks').select('*').order('created_at', { ascending: false });
  if (!data) return [];

  const [nameByCompanyId, { data: profiles }] = await Promise.all([
    gaCompanyNames(data.map((r) => r.ga_company_id)),
    admin.from('planner_profiles').select('id, name').in('id', Array.from(new Set(data.map((r) => r.planner_profile_id)))),
  ]);
  const nameByProfileId = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  return data.map((row) => ({
    id: row.id,
    gaCompanyId: row.ga_company_id,
    gaCompanyName: nameByCompanyId.get(row.ga_company_id) ?? '알 수 없는 GA',
    plannerProfileId: row.planner_profile_id,
    plannerName: nameByProfileId.get(row.planner_profile_id) ?? '알 수 없음',
    createdAt: row.created_at,
  }));
}
