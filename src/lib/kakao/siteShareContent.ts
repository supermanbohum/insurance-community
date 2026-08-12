import { SITE_CONFIG } from '@/lib/config/site';
import { SITE_URL, DEFAULT_META_DESCRIPTION, OG_IMAGE_VERSION, OG_IMAGE_URL } from '@/lib/seo/config';

/**
 * 🔴 버전과 주소의 **정본은 `lib/seo/config.ts`**로 옮겼다(2026-08-12).
 *
 * 왜 옮겼나: 페이지 metadata(og:image)도 같은 소재를 가리키는데, 값이 두 군데에 있으면
 * 한쪽만 올려서 갈라진다 - 그러면 "링크 붙여넣기 카드는 새 이미지, 공유 버튼 카드는
 * 옛 이미지"가 된다. 소재를 바꿀 때 올릴 곳은 이제 `OG_IMAGE_VERSION` 한 곳뿐이다.
 *
 * 아래 두 이름은 기존 호출부를 위해 남겨 둔 별칭이다.
 */
export const SITE_SHARE_IMAGE_VERSION = OG_IMAGE_VERSION;
export const SITE_SHARE_IMAGE_URL = OG_IMAGE_URL;

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
