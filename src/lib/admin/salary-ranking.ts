import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type SalaryRankingStatus = 'pending_review' | 'on_hold' | 'approved' | 'rejected';

export interface SalaryRankingListItem {
  id: string;
  plannerProfileId: string;
  rankingYear: number;
  displayName: string;
  jobTitle: string;
  declaredAnnualIncomeKrw: number;
  confirmedAnnualIncomeKrw: number | null;
  status: SalaryRankingStatus;
  reviewReason: string | null;
  ocrStatus: 'not_run' | 'pending' | 'completed' | 'failed';
  ocrExtractedIncomeKrw: number | null;
  ocrConfidence: number | null;
  createdAt: string;
}

function toListItem(row: {
  id: string;
  planner_profile_id: string;
  ranking_year: number;
  display_name: string;
  job_title: string;
  declared_annual_income_krw: number;
  confirmed_annual_income_krw: number | null;
  status: SalaryRankingStatus;
  review_reason: string | null;
  ocr_status: 'not_run' | 'pending' | 'completed' | 'failed';
  ocr_extracted_income_krw: number | null;
  ocr_confidence: number | null;
  created_at: string;
}): SalaryRankingListItem {
  return {
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    rankingYear: row.ranking_year,
    displayName: row.display_name,
    jobTitle: row.job_title,
    declaredAnnualIncomeKrw: row.declared_annual_income_krw,
    confirmedAnnualIncomeKrw: row.confirmed_annual_income_krw,
    status: row.status,
    reviewReason: row.review_reason,
    ocrStatus: row.ocr_status,
    ocrExtractedIncomeKrw: row.ocr_extracted_income_krw,
    ocrConfidence: row.ocr_confidence,
    createdAt: row.created_at,
  };
}

export async function listSalaryRankingSubmissions(options: { status?: SalaryRankingStatus; year?: number } = {}): Promise<SalaryRankingListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('salary_ranking_submissions').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  if (options.year) query = query.eq('ranking_year', options.year);
  const { data } = await query;
  return (data ?? []).map(toListItem);
}

export async function countPendingSalaryRankingSubmissions(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('salary_ranking_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review');
  return count ?? 0;
}

export interface SalaryRankingDetail extends SalaryRankingListItem {
  plannerRealName: string;
  plannerPhone: string;
  documentUrl: string | null;
}

export async function getSalaryRankingSubmissionDetail(id: string): Promise<SalaryRankingDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('salary_ranking_submissions').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [{ data: profile }, { data: signed }] = await Promise.all([
    admin.from('planner_profiles').select('name, phone').eq('id', row.planner_profile_id).maybeSingle(),
    admin.storage.from('salary-ranking-income-docs').createSignedUrl(row.income_doc_storage_path, 600),
  ]);

  return {
    ...toListItem(row),
    plannerRealName: profile?.name ?? '알 수 없음',
    plannerPhone: profile?.phone ?? '-',
    documentUrl: signed?.signedUrl ?? null,
  };
}
