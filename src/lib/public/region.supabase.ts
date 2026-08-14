import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

export interface SidoGroup {
  sidoCode: string;
  sidoName: string;
  /** 승인된 GA 소속의 공개(visible) 지점 수 - get_platform_core_stats()의 지점 카운트
   * 조건(status/registration_status/deleted_at, GA 승인 상태)과 동일 기준(W-056). */
  branchCount: number;
}

export interface SigunguItem {
  regionId: string;
  sigunguCode: string | null;
  sigunguName: string | null;
}

export interface SigunguGroup extends SigunguItem {
  /** 🔴 `SidoGroup.branchCount`와 **같은 함수**로 센다. 그래야 시/도 합계와 시/군/구 합이
   * 어긋나지 않는다. 0도 그대로 담는다 - 화면에서 숨기지 않는다(오너 지시). */
  branchCount: number;
}

/**
 * 🔴 공개 지점 카운트의 **유일한 기준**. 시/도 카운트(`listSidoGroups`)와 시/군/구
 * 카운트(`listSigunguGroups`)가 이 함수 하나를 공유한다 - 각자 세면 합계가 어긋나고
 * 그 어긋남이 화면에 바로 보인다("경상북도 1개 지점"인데 시군구를 다 더하면 0인 식).
 * 기준은 `get_platform_core_stats()`의 지점 카운트와 같다(W-056).
 *
 * ⚠️ `deleted_at is null`을 빼면 안 된다. **청주시에 소프트 삭제된 시드가 5건 남아 있어서**
 * 그 한 줄을 빠뜨리면 청주시가 1개가 아니라 6개로 나온다. `status`만 보고 판단하면 틀린다.
 */
async function fetchVisibleApprovedBranchRegions(
  supabase: ReturnType<typeof createPublicSupabaseClient>
): Promise<{ sidoCode: string; sigunguCode: string | null }[]> {
  const { data: branchRows, error: branchError } = await supabase
    .from('ga_branch')
    .select('ga_company_id, region:region_id(sido_code, sigungu_code)')
    .eq('status', 'visible')
    .eq('registration_status', 'approved')
    .is('deleted_at', null);
  if (branchError) throw branchError;

  const rows = (branchRows ?? []) as unknown as {
    ga_company_id: string;
    region: { sido_code: string; sigungu_code: string | null } | null;
  }[];

  // ga_company 승인 상태는 조인 필터 문법이 아니라(fragile) 기존 코드베이스 관례대로
  // 별도 승인 GA id 집합을 구해 JS에서 걸러낸다(branch.supabase.ts의 검색 매칭과 동일 패턴).
  const companyIds = Array.from(new Set(rows.map((r) => r.ga_company_id)));
  const approvedCompanyIds = new Set<string>();
  if (companyIds.length > 0) {
    const { data: companies, error: companyError } = await supabase
      .from('ga_company')
      .select('id')
      .in('id', companyIds)
      .eq('approval_status', 'approved')
      .is('deleted_at', null);
    if (companyError) throw companyError;
    for (const c of companies ?? []) approvedCompanyIds.add(c.id);
  }

  const result: { sidoCode: string; sigunguCode: string | null }[] = [];
  for (const row of rows) {
    if (!row.region || !approvedCompanyIds.has(row.ga_company_id)) continue;
    result.push({ sidoCode: row.region.sido_code, sigunguCode: row.region.sigungu_code });
  }
  return result;
}

export async function listSidoGroups(): Promise<SidoGroup[]> {
  // 홈 화면에서도 쓰이므로 cookies()를 건드리지 않는 공개 클라이언트를 쓴다.
  // ⚠️ 예전 주석은 "ISR 캐시 유지"라고 돼 있었는데 사실이 아니다 - 이 클라이언트를 쓰는
  // 공개 페이지는 전부 force-dynamic이고, 오히려 그 캐시가 "승인했는데 안 보인다"의
  // 원인이었다. 지금은 public.ts가 fetch를 no-store로 강제한다(그 파일 주석 참고).
  const supabase = createPublicSupabaseClient();
  const [{ data, error }, branchRegions] = await Promise.all([
    supabase.from('regions').select('sido_code, sido_name').order('sort_order'),
    fetchVisibleApprovedBranchRegions(supabase),
  ]);
  if (error) throw error;

  const branchCountBySido = new Map<string, number>();
  for (const row of branchRegions) {
    branchCountBySido.set(row.sidoCode, (branchCountBySido.get(row.sidoCode) ?? 0) + 1);
  }

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    if (!seen.has(row.sido_code)) seen.set(row.sido_code, row.sido_name);
  }
  // 🔴 여기서 이름순으로 다시 정렬하지 않는다. 23행이 이미 sort_order로 정렬해
  // 가져오고(서울 1001 → 경기 2001 → 부산 3001 …), Map은 삽입 순서를 보존하므로
  // 그 순서가 그대로 유지된다. 예전에 localeCompare로 재정렬하는 줄이 있었는데,
  // 그 한 줄이 DB 정렬을 통째로 무효화해서 "강원 → 경기 → … → 서울(9번째)"이
  // 나왔다. 지역 순서는 가나다순이 아니라 서울·경기 우선이 사양이다.
  return Array.from(seen.entries())
    .map(([sidoCode, sidoName]) => ({ sidoCode, sidoName, branchCount: branchCountBySido.get(sidoCode) ?? 0 }));
}

// generateMetadata와 페이지 컴포넌트가 같은 요청 안에서 각각 호출하므로 react cache()로
// 요청 단위 메모이제이션한다(요청 간에는 공유되지 않음 - 오래된 데이터가 남지 않는다).
export const listSigunguBySido = cache(async function listSigunguBySido(
  sidoCode: string
): Promise<{ sidoName: string; items: SigunguItem[] }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('regions')
    .select('id, sido_name, sigungu_code, sigungu_name')
    .eq('sido_code', sidoCode)
    .order('sort_order');
  if (error) throw error;

  const rows = data ?? [];
  return {
    sidoName: rows[0]?.sido_name ?? '',
    items: rows
      .filter((r) => r.sigungu_code)
      .map((r) => ({ regionId: r.id, sigunguCode: r.sigungu_code, sigunguName: r.sigungu_name })),
  };
});

/**
 * 지역 상세(`/region/[sido]`)가 쓰는, **지점 수가 붙은** 시/군/구 목록.
 *
 * 오너 지시(2026-08-13): 「경산시 0개 지점」처럼 **0도 그대로 표기**한다. 그래서 지점이
 * 있는 시군구만 남기지 않고 전체를 그대로 돌려준다.
 *
 * 🔴 카운트는 `fetchVisibleApprovedBranchRegions`를 그대로 재사용한다. 여기서 새로 세면
 * 상위 `/region`의 시/도 숫자와 어긋나고, 그 어긋남은 한 번만 봐도 눈에 띈다.
 */
export async function listSigunguGroups(
  sidoCode: string
): Promise<{ sidoName: string; items: SigunguGroup[] }> {
  const supabase = createPublicSupabaseClient();
  const [{ sidoName, items }, branchRegions] = await Promise.all([
    listSigunguBySido(sidoCode),
    fetchVisibleApprovedBranchRegions(supabase),
  ]);

  const countBySigungu = new Map<string, number>();
  for (const row of branchRegions) {
    if (row.sidoCode !== sidoCode || !row.sigunguCode) continue;
    countBySigungu.set(row.sigunguCode, (countBySigungu.get(row.sigunguCode) ?? 0) + 1);
  }

  return {
    sidoName,
    items: items.map((item) => ({
      ...item,
      branchCount: item.sigunguCode ? (countBySigungu.get(item.sigunguCode) ?? 0) : 0,
    })),
  };
}

export interface SigunguRegion {
  regionId: string;
  sidoCode: string;
  sigunguName: string;
}

/** B2(오너 지시, 2026-08-10) - 검색 필터의 지역 칩을 시/도→시/군/구 2단 드릴다운으로
 * 만들기 위해 전국 시/군/구 목록을 한 번에 가져온다. regions 테이블 전체가 229행뿐이라
 * (listAllRegionsForSitemap과 동일 근거) 필터 시트를 열 때마다 매번 통째로 내려줘도
 * 무겁지 않다 - 사용자가 시/도를 바꿀 때마다 서버 왕복 없이 클라이언트에서
 * sidoCode로 걸러 보여준다. "동" 단계는 만들지 않는다(법정동 데이터 미해결,
 * regions 테이블 자체에 그 레벨이 없다 - 오너 지시 "동 노출 0"). */
export async function listAllSigunguRegions(): Promise<SigunguRegion[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('regions')
    .select('id, sido_code, sigungu_name')
    .not('sigungu_code', 'is', null)
    .order('sort_order');
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.sigungu_name)
    .map((r) => ({ regionId: r.id, sidoCode: r.sido_code, sigunguName: r.sigungu_name as string }));
}

export async function getRegionById(regionId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('regions').select('*').eq('id', regionId).maybeSingle();
  if (error) throw error;
  return data;
}

/** sitemap.xml 전용 - 시/도 + 시/군/구 코드 전체를 한 번에 가져온다(regions 테이블은 행 수가
 * 적어 무겁지 않다). /region/[sido], /region/[sido]/[sigungu] 항목을 여기서 조립한다. */
export async function listAllRegionsForSitemap(): Promise<{ sidoCode: string; sigunguCode: string | null }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('regions').select('sido_code, sigungu_code');
  if (error) throw error;
  return (data ?? []).map((row) => ({ sidoCode: row.sido_code, sigunguCode: row.sigungu_code }));
}
