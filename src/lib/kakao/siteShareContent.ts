import { SITE_CONFIG } from '@/lib/config/site';
import { SITE_URL, DEFAULT_META_DESCRIPTION } from '@/lib/seo/config';

/** 홈/햄버거 메뉴의 "친구에게 공유하기"가 공유하는 사이트 전역 콘텐츠(오너 지시,
 * 카카오 공유 1순위) - 루트 layout.tsx의 기본 title/description과 동일 문구를 쓴다. */
export const SITE_SHARE_CONTENT = {
  title: `${SITE_CONFIG.name} | 전국 보험대리점 정보 플랫폼`,
  description: DEFAULT_META_DESCRIPTION,
  imageUrl: `${SITE_URL}/opengraph-image`,
  url: SITE_URL,
};
