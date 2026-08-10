'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';
import { searchApprovedBranchesLite, type BranchSearchResultLite } from '@/lib/public/branch';

export type ActionResult = { success: true } | { success: false; error: string };
export type UploadResult = { success: true; path: string } | { success: false; error: string };

const DOC_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** ③ ⓑ 폼의 지점 검색 - 지점 등록/로그인 페이지가 이미 쓰는 searchApprovedBranchesLite를
 * 그대로 재사용한다(TopPlannerApplicationForm과 동일 패턴). */
export async function searchBranchesForRegistrationAction(query: string): Promise<BranchSearchResultLite[]> {
  return searchApprovedBranchesLite(query);
}

async function uploadDoc(formData: FormData, missingError: string): Promise<UploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: missingError };
  }
  const extension = DOC_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp, pdf 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일은 최대 10MB까지 업로드할 수 있습니다.' };
  }
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('branch-planner-registration-docs')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

export async function uploadBranchPlannerBusinessCardAction(formData: FormData): Promise<UploadResult> {
  return uploadDoc(formData, '명함을 선택해주세요.');
}

export async function uploadBranchPlannerIncomeDocAction(formData: FormData): Promise<UploadResult> {
  return uploadDoc(formData, '원천징수영수증을 선택해주세요.');
}

function describeSubmitError(message: string): string {
  if (message.includes('INVALID_BRANCH')) return '지점을 다시 선택해주세요.';
  if (message.includes('MISSING_BUSINESS_CARD')) return '명함을 업로드해주세요.';
  if (message.includes('INVALID_INCOME')) return '소득증빙을 첨부한 경우 신고 연봉을 입력해주세요.';
  if (message.includes('ALREADY_APPROVED')) return '이미 승인된 등록입니다.';
  if (message.includes('NOT_FULL_MEMBER')) return '정회원만 등록할 수 있습니다.';
  return '등록에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export interface BranchPlannerRegistrationSubmitInput {
  branchId: string;
  name: string;
  jobTitle: string;
  businessCardPath: string;
  incomeDocPath?: string | null;
  declaredAnnualIncomeKrw?: number | null;
}

/** ③ ⓑ 등록/수정 - 같은 RPC(on-conflict-do-update)라 등록·수정 폼이 이 액션 하나를
 * 공유한다(status가 approved가 아니면 재제출=수정으로 처리됨, 0087 참고). */
export async function submitBranchPlannerRegistrationAction(input: BranchPlannerRegistrationSubmitInput): Promise<ActionResult> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('submit_branch_planner_registration', {
    p_branch_id: input.branchId,
    p_name: input.name.trim(),
    p_job_title: input.jobTitle.trim(),
    p_business_card_path: input.businessCardPath,
    p_income_doc_path: input.incomeDocPath ?? null,
    p_declared_annual_income_krw: input.declaredAnnualIncomeKrw ?? null,
  });

  if (error) {
    if (input.businessCardPath) await createAdminClient().storage.from('branch-planner-registration-docs').remove([input.businessCardPath]);
    if (input.incomeDocPath) await createAdminClient().storage.from('branch-planner-registration-docs').remove([input.incomeDocPath]);
    return { success: false, error: describeSubmitError(error.message) };
  }

  revalidatePath('/branch-planner/register');
  revalidatePath('/branch-planner/edit');
  return { success: true };
}

export interface MyBranchPlannerRegistration {
  branchId: string;
  branchName: string;
  gaCompanyName: string;
  name: string;
  jobTitle: string;
  status: string;
}

/** 수정 페이지 진입 시 본인 등록 여부 확인 - "아직 등록하지 않았다"와 "등록되어
 * 있다(prefill)"를 구분하는 데 쓴다. RLS("member reads own")가 본인 행만 반환한다. */
export async function getMyBranchPlannerRegistrationAction(): Promise<MyBranchPlannerRegistration | null> {
  await requireUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('branch_planner_registrations')
    .select('branch_id, name, job_title, status, ga_branch:branch_id(name, ga_company:ga_company_id(name))')
    .maybeSingle();
  if (error || !data) return null;

  const branch = data.ga_branch as unknown as { name: string; ga_company: { name: string } | null } | null;
  return {
    branchId: data.branch_id as string,
    branchName: branch?.name ?? '',
    gaCompanyName: branch?.ga_company?.name ?? '',
    name: data.name as string,
    jobTitle: data.job_title as string,
    status: data.status as string,
  };
}

/** 지점 미연결 하드 게이트 측정(오너 지시) - 막힌 횟수 / 지점장 전달 클릭 횟수.
 * 실패해도 화면 진행에 영향 없게 결과를 무시한다. */
export async function recordBranchPlannerGateEventAction(eventType: 'blocked' | 'forward_click'): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_branch_planner_gate_event', { p_event_type: eventType });
}
