import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { StarTier } from '@/lib/top-designer/labels';

export type TopDesignerStatus = 'pending_review' | 'on_hold' | 'approved' | 'rejected';

export interface TopDesignerListItem {
  id: string;
  plannerProfileId: string;
  plannerName: string;
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
}

async function toListItem(row: {
  id: string;
  planner_profile_id: string;
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
}): Promise<TopDesignerListItem> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from('planner_profiles').select('name').eq('id', row.planner_profile_id).maybeSingle();

  return {
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    plannerName: profile?.name ?? '알 수 없음',
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
  };
}

export async function listTopDesignerCertifications(options: { status?: TopDesignerStatus } = {}): Promise<TopDesignerListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('top_designer_certifications').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];
  return Promise.all(data.map((row) => toListItem(row)));
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
  plannerPhone: string;
  plannerEmail: string;
  documentUrl: string | null;
}

export async function getTopDesignerCertificationDetail(id: string): Promise<TopDesignerDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('top_designer_certifications').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [listItem, { data: profile }, { data: signed }] = await Promise.all([
    toListItem(row),
    admin.from('planner_profiles').select('phone, email').eq('id', row.planner_profile_id).maybeSingle(),
    admin.storage.from('top-designer-income-docs').createSignedUrl(row.income_doc_storage_path, 600),
  ]);

  return {
    ...listItem,
    plannerPhone: profile?.phone ?? '-',
    plannerEmail: profile?.email ?? '-',
    documentUrl: signed?.signedUrl ?? null,
  };
}
