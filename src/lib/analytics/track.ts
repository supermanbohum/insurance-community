'use client';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * 전환 이벤트 전송 - fbq/gtag가 로드돼 있지 않으면(ID 미설정 등) 조용히 아무것도
 * 안 한다. 이메일·전화번호·이름 등 개인정보는 절대 이벤트 파라미터에 넣지 않는다
 * (CTO 지시) - 전환 발생 사실만 보낸다.
 */
function sendConversion(fbEventName: string, gaEventName: string) {
  if (typeof window === 'undefined') return;
  window.fbq?.('track', fbEventName);
  window.gtag?.('event', gaEventName);
}

/** 일반 회원가입 완료(이메일 인증 확정 시점) - VerifiedScreen.tsx */
export function trackSignupComplete() {
  sendConversion('CompleteRegistration', 'sign_up_complete');
}

/** 지점 등록 신청 완료 - OnboardingForm.tsx */
export function trackBranchRegisterComplete() {
  sendConversion('SubmitApplication', 'branch_register_complete');
}

/** 설계사 등록 신청 완료(신규 등록만 - 수정은 제외) - PlannerMarketRegisterForm.tsx */
export function trackPlannerRegisterComplete() {
  sendConversion('SubmitApplication', 'planner_register_complete');
}
