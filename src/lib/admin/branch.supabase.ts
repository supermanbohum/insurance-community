import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, GaStatus } from '@/types/database';

export type BranchRow = Database['public']['Tables']['ga_branch']['Row'];
export type BranchMediaRow = Database['public']['Tables']['branch_media']['Row'];
export type BranchContactRow = Database['public']['Tables']['branch_contacts']['Row'];
export type BranchRecruitRow = Database['public']['Tables']['branch_recruit']['Row'];
export type RegionRow = Database['public']['Tables']['regions']['Row'];
export type InsurerRow = Database['public']['Tables']['insurers']['Row'];

export interface BranchListRow extends BranchRow {
  ga_company: { id: string; name: string; approval_status: string } | null;
  region: { sido_name: string; sigungu_name: string | null } | null;
}

export async function listBranches(options: {
  status?: GaStatus;
  gaCompanyId?: string;
  q?: string;
}): Promise<BranchListRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('ga_branch')
    .select('*, ga_company:ga_company_id(id, name, approval_status), region:region_id(sido_name, sigungu_name)')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (options.status) query = query.eq('status', options.status);
  if (options.gaCompanyId) query = query.eq('ga_company_id', options.gaCompanyId);
  if (options.q) query = query.ilike('name', `%${options.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BranchListRow[];
}

export async function getBranchById(branchId: string): Promise<BranchRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ga_branch').select('*').eq('id', branchId).maybeSingle();
  return data ?? null;
}

export async function getBranchMedia(branchId: string): Promise<BranchMediaRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('branch_media')
    .select('*')
    .eq('branch_id', branchId)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getBranchContacts(branchId: string): Promise<BranchContactRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('branch_contacts')
    .select('*')
    .eq('branch_id', branchId)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getBranchRecruits(branchId: string): Promise<BranchRecruitRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('branch_recruit')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getBranchInsurerIds(branchId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('branch_insurers').select('insurer_id').eq('branch_id', branchId);
  return (data ?? []).map((row) => row.insurer_id);
}

export async function listRegions(): Promise<RegionRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('regions').select('*').order('sort_order', { ascending: true });
  return data ?? [];
}

export async function listInsurers(): Promise<InsurerRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('insurers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function listApprovedGaCompaniesForSelect(): Promise<{ id: string; name: string }[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ga_company').select('id, name').order('name', { ascending: true });
  return data ?? [];
}
