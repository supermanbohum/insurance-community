/**
 * W-060 - 지점 소개글(태그라인)에 들어간 최상급/독점적 표현 감지. 「표시·광고의 공정화에
 * 관한 법률」이 실제로 문제 삼는 유형의 문구들이라, "최강" 같은 단어가 그대로 승인
 * 통과되던 것을 막기 위한 용도다.
 *
 * 완전 자동 차단이 아니라 관리자가 승인 전에 눈으로 보게 하는 "심사 플래그"다(banned_words
 * 처럼 하드 블록하지 않는다) - GA 관리자가 실증 가능한 근거를 갖고 쓴 표현일 수도 있어서
 * 최종 판단은 사람이 한다. 그래서 오탐이 있어도 괜찮고, 과소탐지가 더 위험하다.
 */
const SUPERLATIVE_WORDS = [
  '최강',
  '최고',
  '최다',
  '최대',
  '유일',
  '1위',
  '업계 1위',
  '전국 1위',
  'No.1',
  'NO.1',
  '국내 최고',
  '국내 최대',
  '독보적',
  '압도적',
  '최초',
];

export function detectSuperlativeClaims(text: string): string[] {
  if (!text) return [];
  return SUPERLATIVE_WORDS.filter((word) => text.includes(word));
}
