/**
 * 지점 「짧은 소개」 - 지점명 오른쪽에 작게 붙는 문구(0107).
 *
 * 🔴 기존 「한 줄 소개」(tagline)와 다른 값이다. tagline은 지점명 아래에 그대로 있고,
 * 이것은 그 오른쪽 빈 자리에 들어간다. **자른 것이 아니라 따로 받는 문구**다 -
 * 같은 말이 두 번 보이면 오른쪽에 넣을 이유가 없다(오너 확정 2026-08-12).
 *
 * 🔴 선택 입력이다. 없으면 오른쪽을 **그냥 비운다.** 대체 텍스트나 placeholder를
 * 넣지 않는다 - 오너가 지적한 것이 "오른쪽이 비어 보인다"였는데, 빈 요소를 그리면
 * 그 지적이 그대로 남는다.
 */

/**
 * 상한. 오너 지시는 「10자 미만」이고 DB 제약(0107)도 9자다.
 *
 * ⚠️ 디자인 실측이 더 짧은 값을 내면 **이 상수만** 낮춘다(DB 제약은 천장이라 그대로).
 * 190px 캐러셀 카드에서 지점명과 나눠 쓰는 폭이라, 9자가 실제로 다 보이는지는
 * 실측으로 확인해야 한다 - 오늘 같은 자리에서 한 번 5글자로 잘린 적이 있다.
 */
export const SHORT_TAGLINE_MAX_LENGTH = 9;

/** 폼·서버 양쪽에서 같은 규칙을 쓰기 위한 정규화. 공백만 남으면 "없음"으로 본다. */
export function normalizeShortTagline(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export type ShortTaglineError = 'TOO_LONG';

/** null(미입력)은 항상 유효하다 - 선택 입력이기 때문이다. */
export function validateShortTagline(value: string | null): ShortTaglineError | null {
  if (value === null) return null;
  return value.length > SHORT_TAGLINE_MAX_LENGTH ? 'TOO_LONG' : null;
}

export const SHORT_TAGLINE_HELP = `지점명 옆에 작게 붙습니다. ${SHORT_TAGLINE_MAX_LENGTH}자 이내 · 선택 입력`;
