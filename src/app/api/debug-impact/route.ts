import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TEST_BRANCH_ID = '76ba5a14-3934-4853-9168-eeb50ee75366';
const TEST_GA_COMPANY_ID = 'e5a53796-71a3-4405-8d86-8f0444e19444';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const branchImpact = await supabase.rpc('get_branch_delete_impact', { p_branch_id: TEST_BRANCH_ID }).single();
  const gaImpact = await supabase.rpc('get_ga_company_delete_impact', { p_ga_company_id: TEST_GA_COMPANY_ID }).single();

  // ga_company.deleted_at 컬럼 존재 여부 (0011 section B)
  const gaCompanyDeletedAt = await supabase.from('ga_company').select('id, deleted_at').eq('id', TEST_GA_COMPANY_ID).single();

  // ga_branch status CHECK 제약이 'deleted'를 허용하는지 (0011 section A) - 실제로 세팅해보고 되돌린다
  const setDeletedTest = await supabase.rpc('set_branch_status', { p_branch_id: TEST_BRANCH_ID, p_status: 'deleted' });
  const revertTest = setDeletedTest.error
    ? null
    : await supabase.rpc('set_branch_status', { p_branch_id: TEST_BRANCH_ID, p_status: 'hidden' });

  // set_ga_company_status가 deleted_at 컬럼을 실제로 건드리는지 직접 확인 (상태는 그대로 'hidden' 유지)
  const gaStatusTest = await supabase.rpc('set_ga_company_status', { p_ga_company_id: TEST_GA_COMPANY_ID, p_status: 'hidden' });

  // update_ga_company의 p_name이 optional(신규)인지 required(구버전)인지 확인 - p_name 생략하고 호출
  const updateGaCompanyNewSignature = await supabase.rpc('update_ga_company', {
    p_ga_company_id: TEST_GA_COMPANY_ID,
    p_status: 'hidden',
  } as never);

  return NextResponse.json({
    branchImpact: { data: branchImpact.data, error: branchImpact.error },
    gaImpact: { data: gaImpact.data, error: gaImpact.error },
    gaCompanyDeletedAtColumn: { data: gaCompanyDeletedAt.data, error: gaCompanyDeletedAt.error },
    branchStatusAcceptsDeleted: { error: setDeletedTest.error, reverted: !!revertTest && !revertTest.error },
    gaStatusTest: { error: gaStatusTest.error },
    updateGaCompanyNewSignature: { data: updateGaCompanyNewSignature.data, error: updateGaCompanyNewSignature.error },
  });
}
