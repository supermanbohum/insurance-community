import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AdminBranchInquiry {
  id: string;
  branchId: string;
  branchName: string;
  gaCompanyName: string;
  inquirerName: string;
  contactType: string;
  contactValue: string;
  career: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
}

/** W-059 - 전체 지점 문의 목록(내부 관리자 전용). RPC 자체가 current_admin_id()를
 * 검사하므로 여기서 별도 권한 체크를 반복하지 않는다. */
export async function listAdminBranchInquiries(): Promise<AdminBranchInquiry[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('admin_list_branch_inquiries');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    branchName: row.branch_name,
    gaCompanyName: row.ga_company_name,
    inquirerName: row.inquirer_name,
    contactType: row.contact_type,
    contactValue: row.contact_value,
    career: row.career,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}
