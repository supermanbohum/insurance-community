import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { StarTier } from '@/lib/top-designer/labels';

export type TopDesignerStatus = 'pending_review' | 'on_hold' | 'approved' | 'rejected';
export type TopDesignerRevisionStatus = 'pending_review' | 'on_hold' | 'approved' | 'rejected';

export interface TopDesignerListItem {
  id: string;
  name: string;
  gaCompanyName: string;
  branchName: string | null;
  jobTitle: string;
  declaredAnnualIncomeKrw: number | null;
  confirmedAnnualIncomeKrw: number | null;
  starTier: StarTier | null;
  status: TopDesignerStatus;
  reviewReason: string | null;
  ocrStatus: 'not_run' | 'pending' | 'completed' | 'failed';
  ocrExtractedIncomeKrw: number | null;
  ocrConfidence: number | null;
  createdAt: string;
  /** 승인된 인증에 대해 재심사 중(pending_review/on_hold)인 수정 제안이 있으면 true -
   * 공개 화면/랭킹은 기존 승인값 그대로 노출되지만, 관리자 목록에서는 "재심사 중"을
   * 놓치지 않도록 별도로 표시한다(E, CTO 지시 - 공개상태/심사상태 분리). */
  hasPendingRevision: boolean;
}

interface TopDesignerRow {
  id: string;
  name: string;
  ga_company_id: string;
  branch_name: string | null;
  job_title: string;
  declared_annual_income_krw: number | null;
  confirmed_annual_income_krw: number | null;
  star_tier: StarTier | null;
  status: TopDesignerStatus;
  review_reason: string | null;
  ocr_status: 'not_run' | 'pending' | 'completed' | 'failed';
  ocr_extracted_income_krw: number | null;
  ocr_confidence: number | null;
  created_at: string;
  income_doc_storage_path: string | null;
  business_card_path: string | null;
  user_id: string;
}

async function toListItems(rows: TopDesignerRow[]): Promise<TopDesignerListItem[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const gaCompanyIds = Array.from(new Set(rows.map((r) => r.ga_company_id)));
  const [{ data: companies }, { data: pendingRevisions }] = await Promise.all([
    admin.from('ga_company').select('id, name').in('id', gaCompanyIds),
    admin
      .from('top_designer_certification_revisions')
      .select('certification_id')
      .in('certification_id', rows.map((r) => r.id))
      .in('status', ['pending_review', 'on_hold']),
  ]);
  const companyMap = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const pendingRevisionIds = new Set((pendingRevisions ?? []).map((r) => r.certification_id as string));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    gaCompanyName: companyMap.get(row.ga_company_id) ?? '알 수 없음',
    branchName: row.branch_name,
    jobTitle: row.job_title,
    declaredAnnualIncomeKrw: row.declared_annual_income_krw,
    confirmedAnnualIncomeKrw: row.confirmed_annual_income_krw,
    starTier: row.star_tier,
    status: row.status,
    reviewReason: row.review_reason,
    ocrStatus: row.ocr_status,
    ocrExtractedIncomeKrw: row.ocr_extracted_income_krw,
    ocrConfidence: row.ocr_confidence,
    createdAt: row.created_at,
    hasPendingRevision: pendingRevisionIds.has(row.id),
  }));
}

export async function listTopDesignerCertifications(options: { status?: TopDesignerStatus } = {}): Promise<TopDesignerListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('top_designer_certifications').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];
  return toListItems(data as TopDesignerRow[]);
}

export async function countPendingTopDesignerCertifications(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('top_designer_certifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review');
  return count ?? 0;
}

export interface TopDesignerDetail extends TopDesignerListItem {
  applicantEmail: string;
  applicantContact: string;
  documentUrl: string | null;
  businessCardUrl: string | null;
}

/** 신청자 연락처는 top_designer_certifications가 아니라 public.users(user_id)에서
 * 가져온다 - 마켓 planner_profiles를 더 이상 참조하지 않는다(구조 분리).
 *
 * income_doc_storage_path/business_card_path는 심사 완료(승인/반려) 후 파기돼 null이
 * 될 수 있다 - null이면 서명 URL을 만들지 않고 링크 없음으로 둔다("파기됨"이 정상
 * 상태이지, 에러가 아니다). */
export async function getTopDesignerCertificationDetail(id: string): Promise<TopDesignerDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('top_designer_certifications').select('*').eq('id', id).maybeSingle();
  if (!row) return null;
  const typedRow = row as TopDesignerRow;

  const [[listItem], { data: user }, signedDoc, signedCard] = await Promise.all([
    toListItems([typedRow]),
    admin.from('users').select('email, contact').eq('id', typedRow.user_id).maybeSingle(),
    typedRow.income_doc_storage_path
      ? admin.storage.from('top-designer-income-docs').createSignedUrl(typedRow.income_doc_storage_path, 600)
      : Promise.resolve({ data: null }),
    typedRow.business_card_path
      ? admin.storage.from('top-designer-income-docs').createSignedUrl(typedRow.business_card_path, 600)
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...listItem,
    applicantEmail: user?.email ?? '-',
    applicantContact: user?.contact ?? '-',
    documentUrl: signedDoc.data?.signedUrl ?? null,
    businessCardUrl: signedCard.data?.signedUrl ?? null,
  };
}

export interface TopDesignerRevisionDetail {
  id: string;
  certificationId: string;
  jobTitle: string;
  gaCompanyName: string;
  branchName: string | null;
  declaredAnnualIncomeKrw: number | null;
  status: TopDesignerRevisionStatus;
  reviewReason: string | null;
  documentUrl: string | null;
  businessCardUrl: string | null;
  createdAt: string;
}

/** 승인된 인증에 재심사 중(또는 가장 최근 처리된) 수정 제안이 있으면 반환한다 -
 * unique(certification_id)라 인증당 최대 1건이다. 없으면 null(정상 상태 - 수정
 * 제안이 아예 없는 게 대부분이다). */
export async function getTopDesignerRevisionForCertification(certificationId: string): Promise<TopDesignerRevisionDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('top_designer_certification_revisions')
    .select('*')
    .eq('certification_id', certificationId)
    .maybeSingle();
  if (!row) return null;

  const [{ data: company }, signedDoc, signedCard] = await Promise.all([
    admin.from('ga_company').select('name').eq('id', row.ga_company_id).maybeSingle(),
    row.income_doc_storage_path
      ? admin.storage.from('top-designer-income-docs').createSignedUrl(row.income_doc_storage_path, 600)
      : Promise.resolve({ data: null }),
    row.business_card_path
      ? admin.storage.from('top-designer-income-docs').createSignedUrl(row.business_card_path, 600)
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: row.id,
    certificationId: row.certification_id,
    jobTitle: row.job_title,
    gaCompanyName: company?.name ?? '알 수 없음',
    branchName: row.branch_name,
    declaredAnnualIncomeKrw: row.declared_annual_income_krw,
    status: row.status,
    reviewReason: row.review_reason,
    documentUrl: signedDoc.data?.signedUrl ?? null,
    businessCardUrl: signedCard.data?.signedUrl ?? null,
    createdAt: row.created_at,
  };
}
