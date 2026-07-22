import { createServerSupabaseClient } from '@/lib/supabase/server';

export type GaOperationType = 'direct' | 'branch';

export interface PublicGaListItem {
  id: string;
  slug: string;
  name: string;
  ceoName: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  branchCount: number;
  operationType: GaOperationType;
}

export async function listPublicGaCompanies(options: {
  q?: string;
  gaCompanyIds?: string[];
  operationType?: GaOperationType;
}): Promise<PublicGaListItem[]> {
  const supabase = createServerSupabaseClient();
  const logoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;

  let query = supabase
    .from('ga_company')
    .select('id, slug, name, ceo_name, is_verified, logo_path, operation_type, ga_branch(id)')
    .order('name', { ascending: true });

  if (options.q) {
    query = query.ilike('name', `%${options.q}%`);
  }

  if (options.gaCompanyIds && options.gaCompanyIds.length > 0) {
    query = query.in('id', options.gaCompanyIds);
  }

  if (options.operationType) {
    query = query.eq('operation_type', options.operationType);
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
    operationType: row.operation_type as GaOperationType,
  }));
}

export interface PublicGaDetail {
  id: string;
  slug: string;
  name: string;
  ceoName: string | null;
  description: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  updatedAt: string;
  operationType: GaOperationType;
  branches: { id: string; name: string; address: string; sidoName: string | null; sigunguName: string | null }[];
}

export async function getPublicGaDetailBySlug(slug: string): Promise<PublicGaDetail | null> {
  const supabase = createServerSupabaseClient();
  const logoBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;

  const { data: company, error } = await supabase
    .from('ga_company')
    .select('id, slug, name, ceo_name, description, is_verified, logo_path, updated_at, operation_type')
    .eq('slug', slug)
    .single();

  if (error || !company) return null;

  const { data: branches, error: branchesError } = await supabase
    .from('ga_branch')
    .select('id, name, address, region:region_id(sido_name, sigungu_name)')
    .eq('ga_company_id', company.id)
    .order('name', { ascending: true });
  if (branchesError) throw branchesError;

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    ceoName: company.ceo_name,
    description: company.description,
    isVerified: company.is_verified,
    logoUrl: company.logo_path ? `${logoBaseUrl}/${company.logo_path}` : null,
    updatedAt: company.updated_at,
    operationType: company.operation_type as GaOperationType,
    branches: (branches ?? []).map((b) => {
      const region = b.region as unknown as { sido_name: string; sigungu_name: string | null } | null;
      return {
        id: b.id,
        name: b.name,
        address: b.address,
        sidoName: region?.sido_name ?? null,
        sigunguName: region?.sigungu_name ?? null,
      };
    }),
  };
}
