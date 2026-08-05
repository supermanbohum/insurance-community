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

export interface GaCompanySearchResult {
  id: string;
  name: string;
  approvalStatus: string;
}

/** 열람권 지급 대상 검색 - 이름으로 GA사를 찾는다(승인 상태 무관, 관리자는 미승인 GA에도
 * 미리 지급할 수 있어야 하므로). */
export async function searchGaCompaniesForCreditGrant(q: string): Promise<GaCompanySearchResult[]> {
  const admin = createAdminClient();
  const trimmed = q.trim();
  if (!trimmed) return [];
  const { data } = await admin
    .from('ga_company')
    .select('id, name, approval_status')
    .neq('status', 'deleted')
    .ilike('name', `%${trimmed}%`)
    .order('name', { ascending: true })
    .limit(20);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, approvalStatus: row.approval_status }));
}

export interface CreditHistoryEntry {
  id: string;
  date: string;
  type: '관리자 지급' | '관리자 차감' | '구매' | '설계사 연락처 열람';
  delta: number;
  note: string;
}

export interface GaCompanyCreditSummary {
  gaCompanyId: string;
  gaCompanyName: string;
  /** 남은(현재 잔액) + 사용(누적 열람 수) = 보유(지금까지 확보한 총량) - 환불/차감이 있어도
   * 항상 두 근거값(잔액/사용횟수)에서 그대로 계산되므로 숫자가 어긋날 일이 없다. */
  balance: number;
  used: number;
  totalGranted: number;
  history: CreditHistoryEntry[];
}

/** 열람권 지급 패널 전용 - 특정 GA사 하나의 잔액 요약 + 지급/구매/사용 통합 이력. */
export async function getGaCompanyCreditSummary(gaCompanyId: string): Promise<GaCompanyCreditSummary | null> {
  const admin = createAdminClient();

  const [{ data: company }, { data: balanceRow }, { data: adjustments }, { data: purchases }, { data: unlocks }] = await Promise.all([
    admin.from('ga_company').select('id, name').eq('id', gaCompanyId).maybeSingle(),
    admin.from('planner_market_credit_balances').select('balance').eq('ga_company_id', gaCompanyId).maybeSingle(),
    admin
      .from('planner_market_credit_adjustments')
      .select('id, delta, reason, created_at')
      .eq('ga_company_id', gaCompanyId)
      .order('created_at', { ascending: false }),
    admin
      .from('planner_market_credit_purchases')
      .select('id, credit_count, tier_code, status, created_at')
      .eq('ga_company_id', gaCompanyId)
      .order('created_at', { ascending: false }),
    admin
      .from('planner_market_credit_unlocks')
      .select('id, planner_profile_id, created_at')
      .eq('ga_company_id', gaCompanyId)
      .order('created_at', { ascending: false }),
  ]);

  if (!company) return null;

  const plannerIds = Array.from(new Set((unlocks ?? []).map((u) => u.planner_profile_id)));
  const { data: planners } =
    plannerIds.length > 0 ? await admin.from('planner_profiles').select('id, name').in('id', plannerIds) : { data: [] };
  const plannerNameMap = new Map((planners ?? []).map((p) => [p.id, p.name]));

  const balance = balanceRow?.balance ?? 0;
  const used = unlocks?.length ?? 0;

  const history: CreditHistoryEntry[] = [
    ...(adjustments ?? []).map((a) => ({
      id: a.id,
      date: a.created_at,
      type: (a.delta > 0 ? '관리자 지급' : '관리자 차감') as CreditHistoryEntry['type'],
      delta: a.delta,
      note: a.reason,
    })),
    ...(purchases ?? []).map((p) => ({
      id: p.id,
      date: p.created_at,
      type: '구매' as const,
      delta: p.status === 'refunded' ? 0 : p.credit_count,
      note: p.status === 'refunded' ? `${p.tier_code} 구매 (환불됨)` : `${p.tier_code} 구매`,
    })),
    ...(unlocks ?? []).map((u) => ({
      id: u.id,
      date: u.created_at,
      type: '설계사 연락처 열람' as const,
      delta: -1,
      note: plannerNameMap.get(u.planner_profile_id) ?? '알 수 없는 설계사',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    gaCompanyId: company.id,
    gaCompanyName: company.name,
    balance,
    used,
    totalGranted: balance + used,
    history,
  };
}
