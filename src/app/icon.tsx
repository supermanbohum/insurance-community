import { ImageResponse } from 'next/og';
import { loadOgFonts } from '@/lib/seo/ogFonts';

// nodejs 런타임의 @vercel/og 번들이 Windows에서 기본 폰트 경로를 잘못 만들어
// "Invalid URL"로 빌드가 깨지는 알려진 버그(vercel/next.js#77164)가 있어 edge로 돌린다.
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** 파비콘 - 헤더/푸터에서 쓰는 ShieldCheck 로고 마크를 그대로 재사용한 브랜드 아이콘.
 * 텍스트가 없는 순수 SVG라도 next/og가 기본 폰트를 내부적으로 로드하려다 실패하는
 * 경우가 있어(환경에 따른 Invalid URL) 다른 이미지 라우트와 동일하게 폰트를 명시한다. */
export default async function Icon() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2f6bff, #152d70)',
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
    ),
    { ...size, fonts }
  );
}
