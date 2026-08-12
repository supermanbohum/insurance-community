import { SITE_CONFIG } from '@/lib/config/site';

/** 후행 슬래시 없는 절대 사이트 URL - canonical/OG/JSON-LD 전부 이 값을 기준으로 조립한다. */
export const SITE_URL = SITE_CONFIG.url.replace(/\/$/, '');

export const DEFAULT_META_DESCRIPTION =
  '전국 보험대리점(GA)과 보험회사별 정보를 한곳에서 확인하세요. 지역별 채용정보부터 보험설계사 리크루팅까지 보험맵에서 확인할 수 있습니다.';

export const DEFAULT_KEYWORDS = ['보험맵', '보험대리점', 'GA', '보험설계사', '보험회사', '보험 리크루팅'];

/**
 * OG 소재(app/opengraph-image.tsx)의 버전.
 *
 * 🔴🔴 소재를 바꾸면 이 값을 반드시 올릴 것. 🔴🔴 안 올리면 카카오톡 공유 카드에
 * **옛 이미지가 계속 뜬다.** 2026-08-11에 실제로 그 사고가 났다.
 *   - 카카오는 이미지 URL 단위로 따로 캐시한다(페이지 스크랩 캐시와 별개).
 *   - 그래서 카카오 공유 디버거의 「캐시 초기화」로는 안 지워진다.
 *   - 서버가 새 바이트를 내보내는 것과도 무관하다 - 사고 당시 신규본을 내려주고
 *     있었는데도 카톡은 옛 이미지를 물고 있었다.
 *   - **우리가 URL을 바꿔 주는 것 말고는 갱신을 강제할 방법이 없다.**
 *
 * ⚠️ 페이지 metadata에 og:image를 문자열로 직접 주면 Next가 자동으로 붙이던 콘텐츠
 * 해시(`?d866335e…`)가 사라진다 - 그 해시는 코드에서 참조할 수 없다. 그래서 우리가
 * 직접 붙이는 이 버전이 유일한 캐시 무효화 수단이 된다.
 * 쿼리스트링은 opengraph-image 라우트가 무시하므로 응답 바이트는 같다.
 */
export const OG_IMAGE_VERSION = '20260811';

/** OG 소재의 절대 주소(버전 포함). 페이지 metadata와 카카오 공유가 같은 값을 쓴다. */
export const OG_IMAGE_URL = `${SITE_URL}/opengraph-image?v=${OG_IMAGE_VERSION}`;

/**
 * 페이지별 og:title/og:description/og:url을 만든다.
 *
 * 🔴 페이지의 `title`/`description`은 **og로 흘러가지 않는다.** Next.js는 openGraph를
 * 따로 상속시키므로, 페이지가 openGraph를 정의하지 않으면 루트 layout의 값이 그대로
 * 나간다 - 즉 모든 페이지의 og:title이 「보험맵」이 된다.
 * 운영에서 확인한 값(2026-08-12, curl로 응답 HTML 직접 확인):
 *   /register              og:title=보험맵  <title>우리 지점 등록 — 지금 등록하면 0원…
 *   /branch-planner-register  같음
 *   /privacy                  같음
 *
 * 🔴 `images`를 반드시 넘긴다(W-071에서 같은 사고). openGraph를 재정의하면서 images를
 * 비우면 **루트 app/opengraph-image.tsx 상속이 끊겨** 카드에 이미지가 사라진다.
 * 자체 opengraph-image.tsx를 가진 세그먼트(지점 상세)는 이 함수를 쓰지 말 것 -
 * 그쪽은 명시하면 이미지가 중복된다.
 *
 * ⚠️ 이 값들은 **링크를 붙여넣을 때**(검색결과·카톡 링크 미리보기·타 SNS) 쓰인다.
 * 사이트의 「친구에게 공유하기」 버튼은 OG를 읽지 않는다 - 그쪽은
 * `lib/kakao/siteShareContent.ts`가 값을 직접 카카오에 넘긴다. 둘은 별개 경로다.
 */
export function pageOpenGraph(input: { title: string; description: string; path: string }) {
  return {
    title: input.title,
    description: input.description,
    // og:url을 안 주면 루트 layout의 값이 남아 **어느 페이지를 붙여넣어도 홈으로 연결된다**
    // (운영에서 /register·/privacy 모두 og:url=https://bohummap.com 이었다).
    url: `${SITE_URL}${input.path}`,
    // 🔴 이 줄을 지우면 og:image가 통째로 사라진다. 상속으로 대체되지 않는다 -
    // 실측으로 확인했다(2026-08-12): images를 빼고 /privacy를 받아보니 og:title/
    // description/url만 남고 og:image 태그 자체가 없었다.
    // width/height/contentType은 파일 규약(app/opengraph-image.tsx)에서 자동으로 붙던
    // 값인데, 문자열로 직접 주면 안 붙는다. 소재와 같은 값을 명시해 되살린다.
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, type: 'image/png' }],
  };
}

/**
 * 검색엔진 사이트 소유 확인(Search Console/네이버 서치어드바이저) 메타 태그.
 * Vercel 환경변수에 값만 등록하면 바로 반영된다 - 값이 없으면 해당 태그를 아예 생략한다
 * (metadata.verification에 undefined를 넘기면 content="undefined"로 그대로 렌더링되므로
 * 반드시 값이 있는 키만 골라서 넘겨야 한다).
 *
 * 등록 방법:
 * - Google Search Console: 속성 추가 > URL 접두어 > HTML 태그 방식 선택 > content 값을
 *   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 환경변수로 등록.
 * - 네이버 서치어드바이저: 사이트 등록 > HTML 태그 방식 선택 > content 값을
 *   NEXT_PUBLIC_NAVER_SITE_VERIFICATION 환경변수로 등록.
 */
export function getVerificationMeta(): { google?: string; other?: Record<string, string> } {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

  const verification: { google?: string; other?: Record<string, string> } = {};
  if (google) verification.google = google;
  if (naver) verification.other = { 'naver-site-verification': naver };
  return verification;
}
