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

/**
 * 🔴 「9자까지」만 알려주면 안 된다(콘텐츠 확정 2026-08-12). 상한만 말하면 사용자가
 * 상한까지 채우는데, 190px 목록 카드에서는 지점명이 6자만 넘어도 9자가 **통째로
 * 숨겨진다**(자르지 않고 숨기는 규칙이라 아예 안 보인다). 상한을 지켰는데 화면에
 * 없는 상태가 되고, 사용자는 이유를 알 수 없다.
 * 그래서 상한이 아니라 **"짧을수록 잘 보인다"는 방향**을 알려준다.
 * ⚠️ 글자 수 카운터는 별도로 붙인다 - 상한 자체를 숨기라는 뜻은 아니다.
 */
export const SHORT_TAGLINE_HELP = '지점명 옆에 작게 붙습니다. 짧을수록 목록에 더 잘 표시됩니다.';

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

   폭 계산: 한글 1자 폭이 폰트크기에 비례해 **굵기와 무관하게 일정**하므로 렌더 없이
   서버에서 계산된다. 아래 비율은 **운영 화면에서 직접 잰 값**이다(2026-08-12).
   ⚠️ 폰트는 **Noto Sans KR**이다(next/font로 로드). 디자인 실측 문서는 Pretendard로
   적혀 있는데 실제로 적용되는 것은 Noto Sans KR이고, 다행히 한글 비율이 0.91 vs 0.92로
   거의 같아 결론은 바뀌지 않았다 - 그래도 전제가 다르므로 폰트를 바꾸면 여기를 다시 재라.
     한글  0.92 (가·뷁·원 모두 동일, 400/600/700 모두 동일)
     숫자  0.59   영문 0.634   공백 0.28   가운뎃점 0.3261
   ⚠️ 가운뎃점은 내가 0.223으로 적어 뒀다가 정정했다(2026-08-13). 디자인이 라이브 문구의
   글자를 **코드포인트로 뽑아** 확인했다 - 우리가 쓰는 것은 U+00B7 MIDDLE DOT이고 비율은
   0.3261이다. 검산: 「 · 」 3글자가 0.8861 = 0.28×2 + 0.3261로 맞는다.
   비슷하게 생긴 다른 글자는 값이 전혀 다르다(U+2022 • 0.3781, U+318D ㆍ 0.92,
   U+2027 ‧ 1.0) - **눈으로 고르지 말고 코드포인트로 확인할 것.**
   ⚠️ 이 값은 아래 textWidth()가 쓰지 않는다(한글/그 외 두 비율만 쓴다). 다른 계산에
   옮겨 쓸 때를 위해 남기는 실측표다.
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
const KO_RATIO = 0.92;
/** 영문 0.634가 최대라 그 값을 쓴다 - 숫자(0.59)·공백(0.28)은 더 좁으므로 넘치지 않는다.
 *  🔴 과소추정보다 과대추정이 안전하다: 넘치면 잘리고, 남으면 그냥 여백이다. */
const NARROW_RATIO = 0.634;
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
