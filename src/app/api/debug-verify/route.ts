import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const TEST_BRANCH_ID = '76ba5a14-3934-4853-9168-eeb50ee75366';
const TEST_GA_COMPANY_ID = 'e5a53796-71a3-4405-8d86-8f0444e19444';

/** 0011 재실행 후 실제 반영 여부를 읽기 전용으로 확인 (데이터 변경 없음). */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminClient();

  const branchImpact = await supabase.rpc('get_branch_delete_impact', { p_branch_id: TEST_BRANCH_ID }).single();
  const gaImpact = await supabase.rpc('get_ga_company_delete_impact', { p_ga_company_id: TEST_GA_COMPANY_ID }).single();
  const gaCompanyDeletedAt = await admin.from('ga_company').select('id, deleted_at, status, name').eq('id', TEST_GA_COMPANY_ID).single();

  return NextResponse.json({
    get_branch_delete_impact: { data: branchImpact.data, error: branchImpact.error },
    get_ga_company_delete_impact: { data: gaImpact.data, error: gaImpact.error },
    ga_company_row: { data: gaCompanyDeletedAt.data, error: gaCompanyDeletedAt.error },
  });
}
