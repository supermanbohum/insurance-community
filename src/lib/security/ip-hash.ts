import 'server-only';
import { createHmac } from 'crypto';

/**
 * 요청 IP를 서버 비밀키로 단방향 HMAC-SHA256 해시한다.
 * 원본 IP는 어디에도 저장하지 않으며, 관리자도 원본 IP를 볼 수 없다.
 * 도배/추천 조작 방지, 배너 노출·클릭 중복 제거 등에만 일시적으로 사용한다.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) {
    throw new Error('IP_HASH_SECRET 환경변수가 설정되지 않았습니다.');
  }
  return createHmac('sha256', secret).update(ip).digest('hex');
}

/** Next.js Request에서 클라이언트 IP를 최대한 신뢰성 있게 추출 (프록시 헤더 우선) */
export function extractClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  return '0.0.0.0';
}
