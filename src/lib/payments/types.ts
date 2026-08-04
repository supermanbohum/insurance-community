/**
 * 결제 모듈의 유일한 경계 - subscriptions/payment_transactions 테이블이나 관리자
 * 화면 어디에서도 특정 PG(결제대행사) SDK를 직접 import하지 않는다. 나중에 실제
 * PG가 정해지면 이 인터페이스를 구현하는 어댑터(예: toss-provider.ts) 하나만
 * 추가하고 PAYMENT_PROVIDER 환경변수만 바꾸면 전환된다.
 */
export interface ChargeRequest {
  subscriptionId: string;
  amountKrw: number;
  /** 이전에 등록해둔 결제수단(토큰화된 빌링키 등)을 가리키는 불투명 참조값. */
  paymentMethodRef: string;
}

export interface ChargeResult {
  succeeded: boolean;
  providerTransactionRef: string;
  failureReason?: string;
}

export interface RegisterPaymentMethodInput {
  ga_company_id: string;
  /** 신용카드/계좌이체/네이버페이/카카오페이/구글페이 등 - 실제 PG 연동 시 PG별 파라미터로 확장. */
  method: 'card' | 'bank_transfer' | 'naver_pay' | 'kakao_pay' | 'google_pay';
}

/** 설계사 마켓 열람권/지점 광고 상품처럼 구독이 아닌 1회성 구매용 - subscriptionId가 없다. */
export interface OneTimeChargeRequest {
  /** 'planner_market_credits' | 'branch_ad_product' 등 호출부 컨텍스트 - 로깅/디버깅용, 분기 로직에는 안 쓴다. */
  purpose: string;
  amountKrw: number;
  paymentMethod: 'card' | 'bank_transfer' | 'naver_pay' | 'kakao_pay' | 'google_pay';
}

export interface PaymentProvider {
  readonly name: string;
  chargeRecurring(req: ChargeRequest): Promise<ChargeResult>;
  /** 1회성 결제 - 열람권/광고상품 구매 등 구독이 아닌 단건 결제 전용. */
  chargeOnce(req: OneTimeChargeRequest): Promise<ChargeResult>;
  registerPaymentMethod(input: RegisterPaymentMethodInput): Promise<{ paymentMethodRef: string }>;
  /** 실 PG 웹훅 서명 검증 - PG마다 방식이 달라 여기서만 분기되고 나머지 코드는 몰라도 된다. */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;
}
