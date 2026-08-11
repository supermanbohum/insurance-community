import { SITE_CONFIG } from '@/lib/config/site';
import { SITE_URL, DEFAULT_META_DESCRIPTION } from '@/lib/seo/config';

/**
 * 🔴🔴 소재(app/opengraph-image.tsx)를 바꾸면 이 값을 반드시 올릴 것. 🔴🔴
 *
 * 안 올리면 카카오톡 공유 카드에 **옛 이미지가 계속 뜬다.** 2026-08-11에 정확히 이
 * 사고가 났다 - OG 이미지를 새로 만들어 배포했는데 공유 카드는 며칠 전 이미지였다.
 *
 * 왜 이렇게까지 하느냐:
 *   - 카카오는 **이미지 URL 단위로 따로 캐시**한다. 페이지 URL 캐시와 별개다.
 *   - 그래서 카카오 공유 디버거의 「캐시 초기화」를 눌러도 소용없다. 그건 페이지
 *     스크랩 캐시를 지우는 것이라 이 이미지에는 손이 닿지 않는다(사고 당시 4개 URL을
 *     지웠는데 그대로였다).
 *   - 서버가 새 바이트를 내보내는 것과도 무관하다. 실제로 사고 당시
 *     `/opengraph-image`와 `/opengraph-image?<해시>` 둘 다 신규본(148,081 bytes,
 *     md5 77bd9cf2…)을 내려주고 있었는데도 카톡은 옛 이미지를 물고 있었다.
 *   - 즉 **우리가 URL을 바꿔 주는 것 말고는 갱신을 강제할 방법이 없다.**
 *
 * 날짜 문자열인 이유: 소재를 바꾼 날을 그대로 적으면 "언제 것인지"가 값에 남는다.
 * 형식은 자유지만 **바꿀 때마다 반드시 달라져야** 한다.
 */
export const SITE_SHARE_IMAGE_VERSION = '20260811';

/**
 * 카카오 공유 카드에 쓰는 대표 이미지 주소.
 *
 * ⚠️ 페이지의 og:image와는 다른 주소다. Next.js가 og:image에 자동으로 붙이는
 * 콘텐츠 해시(`?d866335e…`)는 우리가 코드에서 참조할 수 없어서, 여기서는 직접
 * 버전을 붙인다. 쿼리스트링은 opengraph-image 라우트가 무시하므로 응답 바이트는
 * 같고, 카카오 입장에서만 "새 URL"이 된다.
 */
export const SITE_SHARE_IMAGE_URL = `${SITE_URL}/opengraph-image?v=${SITE_SHARE_IMAGE_VERSION}`;

/**
 * 홈/햄버거 메뉴의 "친구에게 공유하기"가 공유하는 사이트 전역 콘텐츠(오너 지시,
 * 카카오 공유 1순위).
 *
 * 🔴 이 title/description은 **페이지의 og:title/og:description과 일부러 다르다.**
 * 다음 사람이 "공유 카드 문구가 안 바뀐다"며 OG 태그만 고치다 시간을 태우지 않도록
 * 적어 둔다:
 *
 *   이 공유는 OG 태그를 **읽지 않는다.** `useKakaoShare` → `Kakao.Share.sendDefault`
 *   ({objectType:'feed'})라서 **아래 값들을 코드가 카카오에 직접 넘긴다.**
 *   카카오가 우리 페이지를 스크랩해서 만드는 카드가 아니다.
 *
 * 그래서 공유 카드를 고치려면 **이 파일**을 고쳐야 하고, 검색결과·카톡 링크 미리보기
 * (스크랩 방식)를 고치려면 페이지 metadata를 고쳐야 한다. 둘은 별개 경로다.
 * 🔴 이번 배포에서 둘을 통일하지 않았다(CTO 판단) - 통일 여부는 별도 결정 사항이다.
 */
export const SITE_SHARE_CONTENT = {
  title: `${SITE_CONFIG.name} | 전국 보험대리점 정보 플랫폼`,
  description: DEFAULT_META_DESCRIPTION,
  imageUrl: SITE_SHARE_IMAGE_URL,
  url: SITE_URL,
};
