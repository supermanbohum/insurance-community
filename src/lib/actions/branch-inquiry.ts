'use server';

import 'server-only';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notifyBranchOwnerOfInquiry } from '@/lib/push/branch-inquiry-push';

export interface SubmitBranchInquiryInput {
  branchId: string;
  inquirerName: string;
  contactType: 'phone' | 'kakao';
  contactValue: string;
  career: string;
  message: string;
  consentCollection: boolean;
  consentThirdParty: boolean;
  /** 폼이 화면에 렌더링된 시각(ISO) - RPC가 이로부터 3초 미만 제출을 봇으로 간주한다. */
  formRenderedAt: string;
}

export type SubmitBranchInquiryErrorCode =
  | 'CONSENT_REQUIRED'
  | 'TOO_FAST'
  | 'INVALID_INPUT'
  | 'MESSAGE_TOO_LONG'
  | 'BRANCH_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export type SubmitBranchInquiryResult = { success: true; id: string } | { success: false; error: SubmitBranchInquiryErrorCode };

/** 프록시 체인의 첫 값(실제 방문자)만 신뢰한다 - x-forwarded-for는 스푸핑 가능해서
 * 강한 방지책은 아니지만, 스펙이 요구한 "IP당 시간당 3건"의 기준선으로는 충분하다. */
function getClientIp(): string | null {
  const h = headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip');
}

function parseErrorCode(message: string): SubmitBranchInquiryErrorCode {
  const codes: SubmitBranchInquiryErrorCode[] = ['CONSENT_REQUIRED', 'TOO_FAST', 'INVALID_INPUT', 'MESSAGE_TOO_LONG', 'BRANCH_NOT_FOUND', 'RATE_LIMITED'];
  return codes.find((code) => message.includes(code)) ?? 'UNKNOWN';
}

/** W-059 - 비로그인 지점 문의 제출. 로그인을 요구하지 않는다(익명 세션 쿠키만 있으면
 * 충분 - RPC는 anon/authenticated 양쪽에 실행 권한이 열려 있다). */
export async function submitBranchInquiryAction(input: SubmitBranchInquiryInput): Promise<SubmitBranchInquiryResult> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc('submit_branch_inquiry', {
    p_branch_id: input.branchId,
    p_inquirer_name: input.inquirerName,
    p_contact_type: input.contactType,
    p_contact_value: input.contactValue,
    p_career: input.career.trim() || null,
    p_message: input.message,
    p_consent_collection: input.consentCollection,
    p_consent_third_party: input.consentThirdParty,
    p_ip_address: getClientIp(),
    p_form_rendered_at: input.formRenderedAt,
  });

  if (error) {
    return { success: false, error: parseErrorCode(error.message) };
  }

  // W-040 - FCM 키가 확보되어(오너 등록 완료) 실제 발송이 가능해진 지점.
  await notifyBranchOwnerOfInquiry(input.branchId);

  return { success: true, id: data as string };
}
