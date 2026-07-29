import type { PaymentProvider } from './types';
import { StubPaymentProvider } from './stub-provider';

let cached: PaymentProvider | null = null;

/**
 * 결제 프로바이더 팩토리 - PAYMENT_PROVIDER 환경변수로 어떤 PG 어댑터를 쓸지 고른다.
 * 지금은 'stub' 하나뿐이다. 실 PG가 정해지면 이 switch에 새 case만 추가하면 된다
 * (호출부는 getPaymentProvider()만 알고 구체적인 구현은 전혀 몰라도 된다).
 */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  const name = process.env.PAYMENT_PROVIDER ?? 'stub';
  switch (name) {
    case 'stub':
    default:
      cached = new StubPaymentProvider();
      return cached;
  }
}
