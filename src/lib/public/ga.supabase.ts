import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GA(회사)는 이제 브랜드 정보(로고/회사명/대표자/소개)만 갖는 상위 엔티티다.
 * 실제 검색/지도/즐겨찾기/상세페이지는 전부 Branch(지점) 기준으로 동작하므로
 * (@/lib/public/branch 참고), 여기서는 목록/필터용 최소 요약만 제공한다.
 */
export interface PublicGaListItem {
  id: string;
  slug: string;
  name: string;
  ceoName: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  branchCount: number;
}

export async function listPublicGaCompanies(options: {
  q?: string;
  gaCompanyIds?: string[];
}): Promise<PublicGaListItem[]> {
  const supabase = createServerSupabaseClient();
  const logoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;

  let query = supabase
    .from('ga_company')
    .select('id, slug, name, ceo_name, is_verified, logo_path, ga_branch(id)')
    .order('name', { ascending: true });

  if (options.q) {
    query = query.ilike('name', `%${options.q}%`);
  }

  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    query = query.in('id', options.gaCompanyIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    ceoName: row.ceo_name,
    isVerified: row.is_verified,
    logoUrl: row.logo_path ? `${logoBaseUrl}/${row.logo_path}` : null,
    branchCount: Array.isArray(row.ga_branch) ? row.ga_branch.length : 0,
  }));
}

/**
 * 옛 /ga/[slug] 링크(공식 상세페이지 폐지 전)가 들어왔을 때 어디로 보낼지 계산한다.
 * 본사 지점이 있으면 그 지점으로, 지점이 정확히 1개면 그 지점으로, 그 외엔 검색으로 보낸다.
 */
export async function getGaRedirectTarget(
  slug: string
): Promise<{ found: boolean; branchSlug: string | null; gaName: string | null }> {
  const supabase = createServerSupabaseClient();
  const { data: company, error } = await supabase.from('ga_company').select('id, name').eq('slug', slug).single();
  if (error || !company) return { found: false, branchSlug: null, gaName: null };

  const { data: branches, error: branchesError } = await supabase
    .from('ga_branch')
    .select('slug, is_headquarters')
    .eq('ga_company_id', company.id)
    .eq('status', 'visible');
  if (branchesError) throw branchesError;

  const list = branches ?? [];
  const headquarters = list.find((b) => b.is_headquarters);
  if (headquarters) return { found: true, branchSlug: headquarters.slug, gaName: company.name };
  if (list.length === 1) return { found: true, branchSlug: list[0].slug, gaName: company.name };
  return { found: true, branchSlug: null, gaName: company.name };
}
