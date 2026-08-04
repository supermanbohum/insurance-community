import { createPublicSupabaseClient } from '@/lib/supabase/public';
import type { PublicPlannerProfileSummary, PlannerMarketCertificationTier } from '@/types/database';

/** cookies()를 건드리지 않는 공개 클라이언트로 public_planner_profiles 뷰만 읽는다 -
 * "설계사 찾기" 목록/상세는 로그인 여부와 무관하게 누구나 볼 수 있다(공개 필드만).
 * 이름/전화/이메일/카카오톡은 이 파일에서 절대 조회하지 않는다 - 그건
 * src/lib/actions/planner-market-credits.ts의 get_planner_contact RPC 전용이다. */

interface PublicPlannerProfileRow {
  id: string;
  profile_photo_path: string | null;
  active_region_id: string;
  career_years: number;
  specialties: string[];
  self_introduction: string | null;
  currently_employed: boolean;
  open_to_move: boolean;
  desired_region_id: string | null;
  desired_ga_company_id: string | null;
  desired_conditions: string | null;
  created_at: string;
  insurer_ids: string[] | null;
  badge_tier: PlannerMarketCertificationTier | null;
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
  rows: PublicPlannerProfileRow[]
): Promise<PublicPlannerProfileSummary[]> {
  if (rows.length === 0) return [];
  const photoBaseUrl = getPhotoBaseUrl();

  const regionIds = Array.from(
    new Set(rows.flatMap((r) => [r.active_region_id, r.desired_region_id]).filter((id): id is string => Boolean(id)))
  );
  const gaCompanyIds = Array.from(new Set(rows.map((r) => r.desired_ga_company_id).filter((id): id is string => Boolean(id))));
  const insurerIds = Array.from(new Set(rows.flatMap((r) => r.insurer_ids ?? [])));

  const [{ data: regions }, { data: gaCompanies }, { data: insurers }] = await Promise.all([
    regionIds.length > 0
      ? supabase.from('regions').select('id, sido_name, sigungu_name').in('id', regionIds)
      : Promise.resolve({ data: [] as { id: string; sido_name: string; sigungu_name: string | null }[] }),
    gaCompanyIds.length > 0
      ? supabase.from('ga_company').select('id, name').in('id', gaCompanyIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    insurerIds.length > 0
      ? supabase.from('insurers').select('id, name').in('id', insurerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const regionMap = new Map((regions ?? []).map((r) => [r.id, r]));
  const gaCompanyMap = new Map((gaCompanies ?? []).map((c) => [c.id, c.name]));
  const insurerMap = new Map((insurers ?? []).map((i) => [i.id, i.name]));

  return rows.map((row) => ({
    id: row.id,
    profilePhotoUrl: row.profile_photo_path ? `${photoBaseUrl}/${row.profile_photo_path}` : null,
    activeRegionId: row.active_region_id,
    activeRegionLabel: regionLabel(regionMap.get(row.active_region_id)),
    careerYears: row.career_years,
    specialties: row.specialties,
    selfIntroduction: row.self_introduction,
    currentlyEmployed: row.currently_employed,
    openToMove: row.open_to_move,
    desiredRegionId: row.desired_region_id,
    desiredRegionLabel: row.desired_region_id ? regionLabel(regionMap.get(row.desired_region_id)) : null,
    desiredGaCompanyId: row.desired_ga_company_id,
    desiredGaCompanyName: row.desired_ga_company_id ? (gaCompanyMap.get(row.desired_ga_company_id) ?? null) : null,
    desiredConditions: row.desired_conditions,
    insurerNames: (row.insurer_ids ?? []).map((id) => insurerMap.get(id)).filter((name): name is string => Boolean(name)),
    badgeTier: row.badge_tier,
    createdAt: row.created_at,
  }));
}

export async function listPublicPlannerProfiles(options: {
  regionId?: string;
  sidoCode?: string;
  minCareerYears?: number;
  desiredGaCompanyId?: string;
  badgeOnly?: boolean;
  limit?: number;
} = {}): Promise<PublicPlannerProfileSummary[]> {
  const supabase = createPublicSupabaseClient();
  let query = supabase.from('public_planner_profiles').select('*');

  if (options.regionId) {
    query = query.eq('active_region_id', options.regionId);
  } else if (options.sidoCode) {
    const { data: regionIds } = await supabase.from('regions').select('id').eq('sido_code', options.sidoCode);
    query = query.in('active_region_id', (regionIds ?? []).map((r) => r.id));
  }
  if (options.minCareerYears) {
    query = query.gte('career_years', options.minCareerYears);
  }
  if (options.desiredGaCompanyId) {
    query = query.eq('desired_ga_company_id', options.desiredGaCompanyId);
  }
  if (options.badgeOnly) {
    query = query.not('badge_tier', 'is', null);
  }
  query = query.order('created_at', { ascending: false });
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return toSummaries(supabase, (data ?? []) as unknown as PublicPlannerProfileRow[]);
}

export async function getPublicPlannerProfile(id: string): Promise<PublicPlannerProfileSummary | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('public_planner_profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [summary] = await toSummaries(supabase, [data as unknown as PublicPlannerProfileRow]);
  return summary ?? null;
}
