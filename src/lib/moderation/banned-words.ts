/**
 * W-072 - 커뮤니티 금지어/외부광고 URL 목록 (CT-022, 콘텐츠팀 확정).
 * `banned_words` DB 테이블은 의도적으로 비워둔다 - 그 테이블을 관리할 어드민 화면이
 * 없어서(W-060에서 확인) 채워봐야 아무도 못 고친다. W-060과 같은 방식으로 코드
 * 상수 목록을 쓴다.
 *
 * **이 목록의 핵심은 넣은 것보다 뺀 것이다** - "대출/투자/원금 보장/수익 보장" 같은
 * 단독 일반명사는 절대 넣지 않는다(설계사 정상 대화의 핵심어와 충돌). 예: "선입금"은
 * 사기 시그니처라 넣지만 "선지급"은 정산 대화 정상 표현이라 뺐다. 보험상품
 * 판매·권유는 사전 차단 대상에서 전량 제외(신고+검토로 이관) - "가입/견적/설계/상담"은
 * 전부 일상어라 키워드로는 오탐만 생산한다는 게 콘텐츠팀 결론이다.
 *
 * 운영 원칙: 오탐 발견 즉시 해당 항목 제거 / 신규 추가는 실제 위반 사례에서만 추출
 * (상상으로 확장 금지) / 월 1회 목록 리뷰.
 */
const BANNED_PHRASES = [
  // 금전 요구·투자 권유·대출 알선(구·복합어만 - 단독 일반명사 없음)
  '리딩방',
  '코인 리딩',
  '투자자 모집',
  '원금 2배',
  '수익 2배',
  '확정 수익',
  '고수익 보장',
  '급전',
  '일수 대출',
  '당일 대출',
  '무직자 대출',
  '무담보 대출',
  '선입금',
  '토토',
  '카지노',
  '바카라',
];

// open.kakao.com은 의도적으로 제외한다(오픈채팅은 설계사 정보방 공유 등 정상 사용이
// 실재 - CTO 결정, 2026-08-08). 홍보일 이후 스팸이 실측되면 그때 추가한다.
const BANNED_URL_PATTERNS = ['bit.ly', 'han.gl', 'url.kr', 'me2.do', 'vo.la', 'c11.kr', 't.me'];

export function containsBannedContent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    BANNED_PHRASES.some((phrase) => text.includes(phrase)) ||
    BANNED_URL_PATTERNS.some((pattern) => lower.includes(pattern))
  );
}
