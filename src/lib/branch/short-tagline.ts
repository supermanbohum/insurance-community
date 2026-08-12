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

/* ─────────────────────────────────────────────────────────────────────────
   표시 판정 (CTO 판정 2026-08-12)

   🔴 지점명을 자르지 않는다. 짧은 소개가 전부 안 들어가면 **짧은 소개를 숨긴다.**
   처음 구현은 반대였다(지점명을 65%에서 자르고 짧은 소개를 항상 노출) - 교환의
   방향이 틀렸다:
     지점명    식별자다. 「메가인포에셋 청주지점」이 「메가인포에셋 청주…」가 되면
               어느 지점인지 알 수 없고, 목록의 존재 이유가 무너진다
     짧은 소개  선택 입력이라 없는 지점이 대다수다. 없어도 카드는 성립한다
   오너 동기로도 같은 결론이다 - 이걸 만든 이유가 「오른쪽이 비어 있어서」인데,
   지점명이 긴 카드는 애초에 오른쪽이 안 비어 있다.

   🔴 잘린 글자는 안 보여주는 것보다 나쁘다(있는데 못 읽는 상태). `text-overflow:
   ellipsis`를 짧은 소개에 쓰지 않는다.

   폭 계산: Pretendard는 한글 1자 폭이 폰트크기 × 0.91로 **굵기와 무관하게 일정**하고
   영문·숫자는 × 0.61이다(디자인 실측). 그래서 렌더 없이 서버에서 계산된다.
   ⚠️ 아래 상수는 **이 저장소의 실제 값** 기준이다(디자인 가정값과 다르다):
        카드 내부 폭  166  (190 − padding 12×2)
        지점명        15px / 700   ← 디자인 가정은 16px/800이었다
        gap           4px          ← 디자인 가정은 6px였다
   이 값이 바뀌면 아래 상수도 함께 바꿔야 한다.
   ───────────────────────────────────────────────────────────────────────── */

const CARD_INNER_WIDTH = 166;
const NAME_FONT_SIZE = 15;
const SHORT_FONT_SIZE = 11;
const GAP = 4;
/** 한글은 폰트크기의 0.91배, 그 외(영문·숫자·기호·공백)는 0.61배로 근사한다. */
const KO_RATIO = 0.91;
const NARROW_RATIO = 0.61;
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

function textWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) w += fontSize * (HANGUL.test(ch) ? KO_RATIO : NARROW_RATIO);
  return w;
}

/**
 * 190px 카드에서 짧은 소개를 보여줄지 판정한다.
 * 🔴 "안 들어가면 숨긴다"가 규칙이다 - 자르지 않는다.
 */
export function fitsShortTaglineInCard(branchName: string, shortTagline: string | null): boolean {
  if (!shortTagline) return false;
  const available = CARD_INNER_WIDTH - textWidth(branchName, NAME_FONT_SIZE) - GAP;
  return available >= textWidth(shortTagline, SHORT_FONT_SIZE);
}
