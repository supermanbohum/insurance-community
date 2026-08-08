import { notFound } from 'next/navigation';

/**
 * "준비 중" 문구 대신 라우트를 숨긴다(W-070의 /jobs와 동일 원칙, CTO 승인 2026-08-08).
 *
 * /jobs·/events와 다른 점: posts 테이블에 이미 best_override_status·auto_best_score·
 * best_rank_override 컬럼이 있다 - "베스트" 랭킹 시스템 자체는 설계돼 있고 이 목록
 * 페이지만 없는 상태다(단순 추천수 정렬이 아니라 이 스코어링 체계를 따라야 정확한
 * 구현이라, 그 설계를 확인 없이 지금 임의로 만들지 않았다 - CTO 보고 참고).
 */
export default function BestPage() {
  notFound();
}
