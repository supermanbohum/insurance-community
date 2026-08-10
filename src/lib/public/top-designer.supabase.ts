import { createPublicSupabaseClient } from '@/lib/supabase/public';
import type { StarTier } from '@/lib/top-designer/labels';

/** cookies()를 건드리지 않는 공개 클라이언트로 public_top_designer_certifications
 * 뷰만 읽는다 - 마켓과 완전 분리된 자체 스키마라 planner_profiles를 전혀 참조하지
 * 않는다(오너 지시 - "이 TOP 설계사가 저 마켓 프로필과 같은 사람"을 DB에서 알 수 없어야
 * 한다). 실명·GA·소속은 오너 확정대로 항상 공개, 사진만 photo_public으로 게이팅된다. */

export interface PublicTopDesignerCardSummary {
  id: string;
  name: string;
  gaCompanyId: string;
  gaCompanyName: string;
  branchName: string | null;
  jobTitle: string;
  starTier: StarTier;
  careerYears: number | null;
  selfIntroduction: string | null;
  certifiedAt: string | null;
  createdAt: string;
  profilePhotoUrl: string | null;
  viewCount: number;
  likeCount: number;
}

interface PublicTopDesignerRow {
  id: string;
  name: string;
  ga_company_id: string;
  ga_company_name: string;
  branch_name: string | null;
  job_title: string;
  star_tier: StarTier;
  career_years: number | null;
  self_introduction: string | null;
  certified_at: string | null;
  created_at: string;
  photo_path: string | null;
  view_count: number;
  like_count: number;
}

function getPhotoBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/top-designer-profile-photos`;
}

function toSummary(row: PublicTopDesignerRow): PublicTopDesignerCardSummary {
  const photoBaseUrl = getPhotoBaseUrl();
  return {
    id: row.id,
    name: row.name,
    gaCompanyId: row.ga_company_id,
    gaCompanyName: row.ga_company_name,
    branchName: row.branch_name,
    jobTitle: row.job_title,
    starTier: row.star_tier,
    careerYears: row.career_years,
    selfIntroduction: row.self_introduction,
    certifiedAt: row.certified_at,
    createdAt: row.created_at,
    profilePhotoUrl: row.photo_path ? `${photoBaseUrl}/${row.photo_path}` : null,
    viewCount: row.view_count,
    likeCount: row.like_count,
  };
}

export type TopDesignerSort = 'views' | 'likes' | 'newest';

export async function listPublicTopDesigners(
  options: { starTier?: StarTier; sort?: TopDesignerSort; offset?: number; limit?: number } = {}
): Promise<PublicTopDesignerCardSummary[]> {
  const supabase = createPublicSupabaseClient();
  let query = supabase.from('public_top_designer_certifications').select('*');

  if (options.starTier) query = query.eq('star_tier', options.starTier);

  const sort = options.sort ?? 'newest';
  if (sort === 'views') query = query.order('view_count', { ascending: false });
  else if (sort === 'likes') query = query.order('like_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 24;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as PublicTopDesignerRow[]).map(toSummary);
}

export async function getPublicTopDesigner(id: string): Promise<PublicTopDesignerCardSummary | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('public_top_designer_certifications').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return toSummary(data as unknown as PublicTopDesignerRow);
}

export interface TopDesignerRankingRow {
  id: string;
  name: string;
  gaCompanyName: string;
  branchName: string | null;
}

/** 홈 하단 랭킹 - 오너 사양대로 "GA/본부(지점)/이름"만, 연봉 자체는 절대 노출하지
 * 않는다(정렬 기준일 뿐). get_top_designer_home_ranking RPC가 서버에서 이미 연봉
 * 내림차순으로 정렬·상위 N 절단까지 끝내서 반환한다 - 클라이언트가 정렬을 바꿀 수
 * 없다(뷰가 아니라 함수라 income 컬럼 자체가 응답에 없다). */
export async function listTopDesignerHomeRanking(limit = 10): Promise<TopDesignerRankingRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('get_top_designer_home_ranking', { p_limit: limit });
  if (error || !data) return [];
  return (data as { id: string; name: string; ga_company_name: string; branch_name: string | null }[]).map((row) => ({
    id: row.id,
    name: row.name,
    gaCompanyName: row.ga_company_name,
    branchName: row.branch_name,
  }));
}

export interface GaQualityRankingRow {
  gaCompanyId: string;
  gaCompanyName: string;
  gaCompanySlug: string;
  score: number;
  /** TOP 설계사 인증을 받은 사람 수만 - "인증 N명"이라고 쓸 수 있는 건 이 값뿐이다. */
  certifiedCount: number;
  /** TOP 인증자 + ③ 미인증 등록자(1점 티어) 전체 - "등록 N명"에 쓴다. certifiedCount로
   * 오인해 "인증 N명"에 쓰면 거짓 표시가 된다(CTO 지적, 2026-08-10, 0089). */
  registeredCount: number;
}

/** 홈 "우수 GA" - 소속 TOP 설계사 별등급을 점수로 합산한 GA 랭킹(오너 지시 ⑤,
 * 2026-08-10, "인기 GA"와 별개로 병존). get_ga_quality_ranking RPC가 서버에서 이미
 * 합산·정렬까지 끝내서 반환한다 - 원천 데이터(개별 확정연봉)는 응답에 없다.
 * 0089부터 ③(branch_planner_registrations)의 미제출자 1점 티어도 포함된다. */
export async function listGaQualityRanking(limit = 10): Promise<GaQualityRankingRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('get_ga_quality_ranking', { p_limit: limit });
  if (error || !data) return [];
  return (
    data as {
      ga_company_id: string;
      ga_company_name: string;
      ga_company_slug: string;
      score: number;
      certified_count: number;
      registered_count: number;
    }[]
  ).map((row) => ({
    gaCompanyId: row.ga_company_id,
    gaCompanyName: row.ga_company_name,
    gaCompanySlug: row.ga_company_slug,
    score: row.score,
    certifiedCount: row.certified_count,
    registeredCount: row.registered_count,
  }));
}

/** sitemap.xml 전용 - 공개 인증 id/등록일만 가볍게 조회한다. 마이그레이션이 아직
 * 적용되지 않은 배포 환경에서도 sitemap.xml 빌드 전체가 깨지지 않도록 조회 실패 시
 * 빈 배열로 폴백한다(throw하지 않음). */
export async function listTopDesignerIdsForSitemap(): Promise<{ id: string; createdAt: string }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('public_top_designer_certifications').select('id, created_at');
  if (error) return [];
  return (data ?? []).map((row) => ({ id: row.id as string, createdAt: row.created_at as string }));
}
