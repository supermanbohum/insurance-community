import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/config/site';

/** PWA 매니페스트 - Next.js가 자동으로 /manifest.webmanifest에 서빙하고 <head>에 링크한다.
 * 아이콘은 icon.tsx/apple-icon.tsx가 만드는 동적 라우트를 그대로 가리킨다(별도 정적 파일 없음). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    short_name: SITE_CONFIG.shortName,
    description: SITE_CONFIG.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: SITE_CONFIG.themeColor,
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
