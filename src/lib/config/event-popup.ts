/**
 * 출시 이벤트 팝업(EventPopup)에 표시되는 문구/수치. 다음 이벤트로 교체할 때 이 파일만
 * 고치면 되고, 팝업 컴포넌트(src/components/marketing/EventPopup.tsx)는 손대지 않는다.
 */
export const EVENT_POPUP_CONTENT = {
  eyebrow: '🎉 보험맵 GRAND OPEN',
  headline: '보험맵 전격 출시!',
  offerLabel: '🎁 오픈 기념 이벤트',
  oldPrice: '월 4,900원',
  badge: '선착순 100개 지점',
  highlight: '6개월 무료',
  highlightSuffix: '(0원)',
  description: '보험설계사를 위한\n전국 GA · 지점 검색 플랫폼',
  features: ['지점 등록', 'TOP설계사 등록', '실시간 채팅', '커뮤니티'],
  footnote: '※ 현재 등록비 및 월 이용료는 오픈 이벤트 기간 동안 전액 무료입니다.',
  ctaLabel: '지금 시작하기',
} as const;
