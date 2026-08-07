import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/** 여러 GA사의 활성 관리자 auth_user_id를 한 번에 조회해 회사별로 묶는다 - 지점별로
 * 여러 건 보낼 때(주간 브리핑, 야간 문의 묶음발송) 매번 개별 쿼리하지 않도록. */
export async function getActiveGaAdminAuthUserIdsByCompany(gaCompanyIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (gaCompanyIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from('ga_admin_users')
    .select('auth_user_id, ga_company_id')
    .in('ga_company_id', gaCompanyIds)
    .eq('is_active', true);

  for (const row of data ?? []) {
    const list = map.get(row.ga_company_id) ?? [];
    list.push(row.auth_user_id);
    map.set(row.ga_company_id, list);
  }
  return map;
}
