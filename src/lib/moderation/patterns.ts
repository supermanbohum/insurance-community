/**
 * 정규식 기반 개인정보 패턴 감지.
 * 금지어(운영자가 관리하는 banned_words)는 DB 쪽 SECURITY DEFINER 함수에서 최종 검증하며,
 * 여기서는 휴대폰번호/주민등록번호 등 구조가 뚜렷한 개인정보만 클라이언트·서버 양쪽에서
 * 빠르게 사전 감지한다.
 */
const PHONE_PATTERN = /01[016789]-?\d{3,4}-?\d{4}/;
const RESIDENT_NUMBER_PATTERN = /\d{6}-?[1-4]\d{6}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export interface PersonalInfoDetection {
  found: boolean;
  reasons: string[];
}

export function detectPersonalInfo(text: string): PersonalInfoDetection {
  const reasons: string[] = [];

  if (PHONE_PATTERN.test(text)) reasons.push('휴대폰 번호로 의심되는 내용');
  if (RESIDENT_NUMBER_PATTERN.test(text)) reasons.push('주민등록번호로 의심되는 내용');
  if (EMAIL_PATTERN.test(text)) reasons.push('이메일 주소로 의심되는 내용');

  return { found: reasons.length > 0, reasons };
}
