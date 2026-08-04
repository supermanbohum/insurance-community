import { randomUUID } from 'crypto';
import type { PaymentProvider, ChargeRequest, ChargeResult, OneTimeChargeRequest, RegisterPaymentMethodInput } from './types';

/**
 * PG 계약 전까지 쓰는 기본 프로바이더 - 항상 성공 처리한다. subscriptions/
 * payment_transactions 상태머신, 유예기간, 관리자 화면을 실 PG 없이도 끝까지
 * 완성하고 검증할 수 있게 해준다. 실패 케이스를 테스트하고 싶으면 이 파일의
 * chargeRecurring을 일시적으로 실패하도록 바꿔서 확인하면 된다.
 */
export class StubPaymentProvider implements PaymentProvider {
  readonly name = 'stub';

  async chargeRecurring(req: ChargeRequest): Promise<ChargeResult> {
    return {
      succeeded: true,
      providerTransactionRef: `stub_${randomUUID()}`,
    };
  }

  async chargeOnce(req: OneTimeChargeRequest): Promise<ChargeResult> {
    return {
      succeeded: true,
      providerTransactionRef: `stub_${randomUUID()}`,
    };
  }

  async registerPaymentMethod(input: RegisterPaymentMethodInput): Promise<{ paymentMethodRef: string }> {
    return { paymentMethodRef: `stub_pm_${randomUUID()}` };
  }

  verifyWebhookSignature(): boolean {
    // 스텁은 실제 웹훅을 받지 않는다 - 항상 거부(실 PG 연동 시 진짜 검증 로직으로 교체).
    return false;
  }
}
