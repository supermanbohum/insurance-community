import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { createAdminClient } from '@/lib/supabase/admin';
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
  /** 그 GA의 **공개 지점 중 점수가 가장 높은 지점**의 대표사진(오너 지시 2026-08-14).
   * 없으면 null - 카드는 기존 그라디언트로 폴백한다. */
  topBranchPhotoUrl: string | null;
  /** storage면 next/image를 태우고, external이면 raw img를 쓴다(remotePatterns 문제 -
   * BranchGallery와 같은 규칙). topBranchPhotoUrl이 null이면 의미 없다. */
  topBranchPhotoSource: 'storage' | 'external' | null;
}

/** star_tier → 점수. 🔴 get_ga_quality_ranking RPC의 매핑과 **같아야 한다**(0089) -
 * 여기서 다르게 매기면 카드 사진이 "점수가 가장 높은 지점"이라는 말과 어긋난다. */
const STAR_TIER_POINTS: Record<string, number> = { star_1: 3, star_2: 5, star_3: 10, star_4: 20 };

/**
 * GA별 「공개 지점 중 점수가 가장 높은 지점」의 대표사진(오너 지시 2026-08-14).
 *
 * 점수 규칙은 GA 랭킹 RPC(0089)를 지점 단위로 그대로 내린 것이다:
 * TOP 인증(star_tier별 3/5/10/20점) + 미인증 승인 등록자(1점). 전 지점이 0점이어도
 * 공개 지점이 있으면 이름 가나다순 첫 지점의 사진을 쓴다 - 이 함수의 목적은 순위
 * 표시가 아니라 **카드에 실제 지점 사진을 보여주는 것**이기 때문이다.
 *
 * ⚠️ service role로 읽는다(my-branch-slot.ts와 같은 서버 전용 패턴) -
 * branch_planner_registrations의 SELECT 정책이 지점 관리자용뿐이라 anon으로는 점수를
 * 못 센다. RPC를 새로 만들면 오너 SQL 실행 대기가 생기는데, 이 조회는 공개해도 되는
 * 값(공개 지점의 대표사진·집계 점수)만 코드로 좁혀 반환하므로 읽기 전용 admin 조회가
 * 기존 관례에 맞다. 🔴 **공개 지점만** 후보다 - 비공개/삭제 지점의 사진이 홈에 나오면
 * 「사이트 공개를 끄면 방문자에게서 사라진다」(G) 원칙이 깨진다.
 *
 * 실패는 조용히 빈 Map - 사진 없이도 랭킹 카드는 그대로 나와야 한다(best-effort).
 */
async function getTopBranchPhotoByGa(
  gaCompanyIds: string[]
): Promise<Map<string, { url: string; source: 'storage' | 'external' }>> {
  const result = new Map<string, { url: string; source: 'storage' | 'external' }>();
  if (gaCompanyIds.length === 0) return result;
  try {
    const admin = createAdminClient();

    const { data: branches } = await admin
      .from('ga_branch')
      .select('id, ga_company_id, name')
      .in('ga_company_id', gaCompanyIds)
      .eq('status', 'visible')
      .eq('registration_status', 'approved')
      .is('deleted_at', null);
    const branchRows = branches ?? [];
    if (branchRows.length === 0) return result;
    const branchIds = branchRows.map((b) => b.id);

    const [{ data: certs }, { data: links }] = await Promise.all([
      admin
        .from('top_designer_certifications')
        .select('branch_id, star_tier, user_id')
        .eq('status', 'approved')
        .in('branch_id', branchIds),
      admin
        .from('branch_planner_registrations')
        .select('branch_id, user_id')
        .eq('status', 'approved')
        .in('branch_id', branchIds),
    ]);

    const certifiedUserIds = new Set((certs ?? []).map((c) => c.user_id));
    const scoreByBranch = new Map<string, number>();
    for (const c of certs ?? []) {
      if (!c.branch_id || !c.star_tier) continue;
      scoreByBranch.set(c.branch_id, (scoreByBranch.get(c.branch_id) ?? 0) + (STAR_TIER_POINTS[c.star_tier] ?? 0));
    }
    for (const l of links ?? []) {
      // 인증자는 위에서 이미 점수를 받았다 - RPC(0089)와 같은 이중 집계 방지.
      if (certifiedUserIds.has(l.user_id)) continue;
      scoreByBranch.set(l.branch_id, (scoreByBranch.get(l.branch_id) ?? 0) + 1);
    }

    // GA별 1위 지점: 점수 내림차순 → 이름 가나다순.
    const topBranchByGa = new Map<string, { id: string }>();
    for (const b of [...branchRows].sort((a, z) => {
      const diff = (scoreByBranch.get(z.id) ?? 0) - (scoreByBranch.get(a.id) ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(z.name, 'ko');
    })) {
      if (!topBranchByGa.has(b.ga_company_id)) topBranchByGa.set(b.ga_company_id, { id: b.id });
    }

    const topBranchIds = Array.from(topBranchByGa.values()).map((b) => b.id);
    const { data: media } = await admin
      .from('branch_media')
      .select('branch_id, source, value')
      .eq('media_type', 'image_main')
      .in('branch_id', topBranchIds);
    const mediaByBranch = new Map((media ?? []).map((m) => [m.branch_id, m]));

    const imageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images`;
    for (const [gaId, top] of topBranchByGa) {
      const m = mediaByBranch.get(top.id);
      if (!m) continue; // 대표사진 없는 지점 - 카드가 그라디언트로 폴백한다.
      result.set(gaId, {
        url: m.source === 'storage' ? `${imageBaseUrl}/${m.value}` : m.value,
        source: m.source as 'storage' | 'external',
      });
    }
    return result;
  } catch {
    return result;
  }
}

/** 홈 "우수 GA" - 소속 TOP 설계사 별등급을 점수로 합산한 GA 랭킹(오너 지시 ⑤,
 * 2026-08-10, "인기 GA"와 별개로 병존). get_ga_quality_ranking RPC가 서버에서 이미
 * 합산·정렬까지 끝내서 반환한다 - 원천 데이터(개별 확정연봉)는 응답에 없다.
 * 0089부터 ③(branch_planner_registrations)의 미제출자 1점 티어도 포함된다.
 * 카드 이미지는 GA별 최고 점수 공개 지점의 대표사진이다(위 getTopBranchPhotoByGa). */
export async function listGaQualityRanking(limit = 10): Promise<GaQualityRankingRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('get_ga_quality_ranking', { p_limit: limit });
  if (error || !data) return [];
  const rows = data as {
    ga_company_id: string;
    ga_company_name: string;
    ga_company_slug: string;
    score: number;
    certified_count: number;
    registered_count: number;
  }[];

  const photoByGa = await getTopBranchPhotoByGa(rows.map((r) => r.ga_company_id));

  return rows.map((row) => ({
    gaCompanyId: row.ga_company_id,
    gaCompanyName: row.ga_company_name,
    gaCompanySlug: row.ga_company_slug,
    score: row.score,
    certifiedCount: row.certified_count,
    registeredCount: row.registered_count,
    topBranchPhotoUrl: photoByGa.get(row.ga_company_id)?.url ?? null,
    topBranchPhotoSource: photoByGa.get(row.ga_company_id)?.source ?? null,
  }));
}

/** ⑨ 우리 동네 순위(오너 지시 "우리동네 제작해 만들어만둬") - listGaQualityRanking과
 * 같은 점수 체계를 지역(시/도, 선택적으로 시/군/구까지)으로 좁힌 버전. 해석 B -
 * "그 지역 지점 소속 인증자·등록자의 점수만 합산"(0093, get_ga_quality_ranking_by_region).
 * 화면 위치/문구는 콘텐츠팀이 정할 예정이라 이 함수는 데이터만 준비해둔다. */
export async function listGaQualityRankingByRegion(
  sidoCode: string,
  sigunguRegionId: string | null,
  limit = 50
): Promise<GaQualityRankingRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('get_ga_quality_ranking_by_region', {
    p_sido_code: sidoCode,
    p_sigungu_region_id: sigunguRegionId,
    p_limit: limit,
  });
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
    // 지역 랭킹(우리 동네)은 아직 화면 미배선(콘텐츠 대기) - 사진 조회를 붙이지 않는다.
    // 화면이 생겨 카드에 사진이 필요해지면 getTopBranchPhotoByGa를 여기도 연결한다.
    topBranchPhotoUrl: null,
    topBranchPhotoSource: null,
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
