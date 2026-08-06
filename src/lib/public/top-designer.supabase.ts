import { createPublicSupabaseClient } from '@/lib/supabase/public';
import type { StarTier } from '@/lib/top-designer/labels';

/** cookies()를 건드리지 않는 공개 클라이언트로 public_top_designer_certifications
 * 뷰만 읽는다 - 이름/전화 등 비공개 필드는 이 뷰에 애초에 없다. */

export interface PublicTopDesignerCardSummary {
  id: string;
  plannerProfileId: string;
  jobTitle: string;
  starTier: StarTier;
  certifiedAt: string | null;
  createdAt: string;
  profilePhotoUrl: string | null;
  activeRegionId: string;
  activeRegionLabel: string;
  careerYears: number;
  specialties: string[];
  selfIntroduction: string | null;
  viewCount: number;
  likeCount: number;
}

interface PublicTopDesignerRow {
  id: string;
  planner_profile_id: string;
  job_title: string;
  star_tier: StarTier;
  certified_at: string | null;
  created_at: string;
  profile_photo_path: string | null;
  active_region_id: string;
  career_years: number;
  specialties: string[];
  self_introduction: string | null;
  view_count: number;
  like_count: number;
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
  rows: PublicTopDesignerRow[]
): Promise<PublicTopDesignerCardSummary[]> {
  if (rows.length === 0) return [];
  const photoBaseUrl = getPhotoBaseUrl();

  const regionIds = Array.from(new Set(rows.map((r) => r.active_region_id)));
  const { data: regions } = await supabase.from('regions').select('id, sido_name, sigungu_name').in('id', regionIds);
  const regionMap = new Map((regions ?? []).map((r) => [r.id, r]));

  return rows.map((row) => ({
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    jobTitle: row.job_title,
    starTier: row.star_tier,
    certifiedAt: row.certified_at,
    createdAt: row.created_at,
    profilePhotoUrl: row.profile_photo_path ? `${photoBaseUrl}/${row.profile_photo_path}` : null,
    activeRegionId: row.active_region_id,
    activeRegionLabel: regionLabel(regionMap.get(row.active_region_id)),
    careerYears: row.career_years,
    specialties: row.specialties,
    selfIntroduction: row.self_introduction,
    viewCount: row.view_count,
    likeCount: row.like_count,
  }));
}

export type TopDesignerSort = 'views' | 'likes' | 'newest';

export async function listPublicTopDesigners(
  options: { starTier?: StarTier; regionId?: string; sort?: TopDesignerSort; offset?: number; limit?: number } = {}
): Promise<PublicTopDesignerCardSummary[]> {
  const supabase = createPublicSupabaseClient();
  let query = supabase.from('public_top_designer_certifications').select('*');

  if (options.starTier) query = query.eq('star_tier', options.starTier);
  if (options.regionId) query = query.eq('active_region_id', options.regionId);

  const sort = options.sort ?? 'newest';
  if (sort === 'views') query = query.order('view_count', { ascending: false });
  else if (sort === 'likes') query = query.order('like_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 24;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return toSummaries(supabase, (data ?? []) as unknown as PublicTopDesignerRow[]);
}

export async function getPublicTopDesigner(id: string): Promise<PublicTopDesignerCardSummary | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('public_top_designer_certifications').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [summary] = await toSummaries(supabase, [data as unknown as PublicTopDesignerRow]);
  return summary ?? null;
}

/** sitemap.xml 전용 - 공개 인증 id/등록일만 가볍게 조회한다. 마이그레이션(0056/0057)이
 * 아직 적용되지 않은 배포 환경에서도 sitemap.xml 빌드 전체가 깨지지 않도록 조회
 * 실패 시 빈 배열로 폴백한다(throw하지 않음) - 마이그레이션 적용 후에는 정상 조회된다. */
export async function listTopDesignerIdsForSitemap(): Promise<{ id: string; createdAt: string }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('public_top_designer_certifications').select('id, created_at');
  if (error) return [];
  return (data ?? []).map((row) => ({ id: row.id as string, createdAt: row.created_at as string }));
}
