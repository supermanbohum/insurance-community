import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface PartnerBranchInquiry {
  id: string;
  branchId: string;
  branchName: string;
  inquirerName: string;
  contactType: string;
  contactValue: string;
  career: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
}

/** W-059 - 내 GA 소속 지점들이 받은 문의 목록. RPC가 ga_admin_users로 소유권을
 * 직접 검사하므로(auth.uid() 기준) 다른 회사의 문의는 애초에 반환되지 않는다. */
export async function listMyBranchInquiries(): Promise<PartnerBranchInquiry[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_my_branch_inquiries');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    branchName: row.branch_name,
    inquirerName: row.inquirer_name,
    contactType: row.contact_type,
    contactValue: row.contact_value,
    career: row.career,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}
