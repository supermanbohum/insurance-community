import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TEST_BRANCH_ID = '76ba5a14-3934-4853-9168-eeb50ee75366';
const TEST_GA_COMPANY_ID = 'e5a53796-71a3-4405-8d86-8f0444e19444';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const branchImpact = await supabase.rpc('get_branch_delete_impact', { p_branch_id: TEST_BRANCH_ID }).single();
  const branchImpactNoSingle = await supabase.rpc('get_branch_delete_impact', { p_branch_id: TEST_BRANCH_ID });
  const gaImpact = await supabase.rpc('get_ga_company_delete_impact', { p_ga_company_id: TEST_GA_COMPANY_ID }).single();

  return NextResponse.json({
    branchImpact: { data: branchImpact.data, error: branchImpact.error, status: branchImpact.status, statusText: branchImpact.statusText },
    branchImpactNoSingle: { data: branchImpactNoSingle.data, error: branchImpactNoSingle.error },
    gaImpact: { data: gaImpact.data, error: gaImpact.error },
  });
}
