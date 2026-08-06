import { createPublicSupabaseClient } from '@/lib/supabase/public';

/** cookies()를 건드리지 않는 공개 클라이언트로 public_salary_ranking_submissions
 * 뷰만 읽는다 - 랭킹 기능의 핵심이므로 확정 연봉을 의도적으로 공개 노출한다
 * (TOP설계사 인증과 달리). 이름은 display_name(자가입력, 실명이 아닐 수 있음)만
 * 노출하며 planner_profiles.name은 절대 조회하지 않는다. */

export interface PublicSalaryRankingCardSummary {
  id: string;
  plannerProfileId: string;
  rankingYear: number;
  jobTitle: string;
  displayName: string;
  annualIncomeKrw: number;
  rankedAt: string | null;
  createdAt: string;
  profilePhotoUrl: string | null;
  activeRegionId: string;
  activeRegionLabel: string;
  viewCount: number;
}

interface PublicSalaryRankingRow {
  id: string;
  planner_profile_id: string;
  ranking_year: number;
  job_title: string;
  display_name: string;
  annual_income_krw: number;
  ranked_at: string | null;
  created_at: string;
  profile_photo_path: string | null;
  active_region_id: string;
  view_count: number;
}

function getPhotoBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/planner-market-profile-photos`;
}

function regionLabel(region: { sido_name: string; sigungu_name: string | null } | undefined): string {
  if (!region) return '';
  return region.sigungu_name ? `${region.sido_name} ${region.sigungu_name}` : region.sido_name;
}

async function toSummaries(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  rows: PublicSalaryRankingRow[]
): Promise<PublicSalaryRankingCardSummary[]> {
  if (rows.length === 0) return [];
  const photoBaseUrl = getPhotoBaseUrl();

  const regionIds = Array.from(new Set(rows.map((r) => r.active_region_id)));
  const { data: regions } = await supabase.from('regions').select('id, sido_name, sigungu_name').in('id', regionIds);
  const regionMap = new Map((regions ?? []).map((r) => [r.id, r]));

  return rows.map((row) => ({
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    rankingYear: row.ranking_year,
    jobTitle: row.job_title,
    displayName: row.display_name,
    annualIncomeKrw: row.annual_income_krw,
    rankedAt: row.ranked_at,
    createdAt: row.created_at,
    profilePhotoUrl: row.profile_photo_path ? `${photoBaseUrl}/${row.profile_photo_path}` : null,
    activeRegionId: row.active_region_id,
    activeRegionLabel: regionLabel(regionMap.get(row.active_region_id)),
    viewCount: row.view_count,
  }));
}

export type SalaryRankingSort = 'income' | 'views' | 'newest';

export async function listPublicSalaryRanking(
  options: { year: number; sort?: SalaryRankingSort; offset?: number; limit?: number }
): Promise<PublicSalaryRankingCardSummary[]> {
  const supabase = createPublicSupabaseClient();
  let query = supabase.from('public_salary_ranking_submissions').select('*').eq('ranking_year', options.year);

  const sort = options.sort ?? 'income';
  if (sort === 'views') query = query.order('view_count', { ascending: false });
  else if (sort === 'newest') query = query.order('created_at', { ascending: false });
  else query = query.order('annual_income_krw', { ascending: false });

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return toSummaries(supabase, (data ?? []) as unknown as PublicSalaryRankingRow[]);
}

export async function getPublicSalaryRankingSubmission(id: string): Promise<PublicSalaryRankingCardSummary | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('public_salary_ranking_submissions').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [summary] = await toSummaries(supabase, [data as unknown as PublicSalaryRankingRow]);
  return summary ?? null;
}

export interface HallOfFameEntry {
  rankingYear: number;
  submissionId: string;
  displayName: string;
  jobTitle: string;
  annualIncomeKrw: number;
  profilePhotoUrl: string | null;
  activeRegionId: string;
}

export async function getSalaryRankingHallOfFame(): Promise<HallOfFameEntry[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('get_salary_ranking_hall_of_fame');
  if (error) throw error;
  const photoBaseUrl = getPhotoBaseUrl();
  return (data ?? []).map((row) => ({
    rankingYear: row.ranking_year,
    submissionId: row.submission_id,
    displayName: row.display_name,
    jobTitle: row.job_title,
    annualIncomeKrw: row.annual_income_krw,
    profilePhotoUrl: row.profile_photo_path ? `${photoBaseUrl}/${row.profile_photo_path}` : null,
    activeRegionId: row.active_region_id,
  }));
}
