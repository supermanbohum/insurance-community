import { notFound } from 'next/navigation';

/**
 * "준비 중" 문구 대신 라우트를 숨긴다(W-070의 /jobs와 동일 원칙, CTO 승인 2026-08-08).
 * /jobs·/best와 다르게 이건 데이터 모델 자체가 없다 - events 테이블이 마이그레이션
 * 어디에도 없다. 집계 페이지만 없는 게 아니라 기능 자체가 없는 경우.
 */
export default function EventsPage() {
  notFound();
}
