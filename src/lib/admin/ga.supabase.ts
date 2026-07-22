import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, GaApprovalStatus } from '@/types/database';

export type GaCompanyRow = Database['public']['Tables']['ga_company']['Row'];
export type GaBranchRow = Database['public']['Tables']['ga_branch']['Row'];

export async function listGaCompanies(options: {
  status?: GaApprovalStatus;
  q?: string;
}): Promise<GaCompanyRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from('ga_company').select('*').order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('approval_status', options.status);
  }
  if (options.q) {
    query = query.or(`name.ilike.%${options.q}%,slug.ilike.%${options.q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getGaCompanyById(gaCompanyId: string): Promise<GaCompanyRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ga_company').select('*').eq('id', gaCompanyId).maybeSingle();
  return data ?? null;
}

export async function getBranchesByGaCompanyId(gaCompanyId: string): Promise<GaBranchRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('ga_branch')
    .select('*')
    .eq('ga_company_id', gaCompanyId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });
  return data ?? [];
}

