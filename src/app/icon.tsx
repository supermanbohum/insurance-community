import { ImageResponse } from 'next/og';
import { loadOgFonts } from '@/lib/seo/ogFonts';
import { BrandMark } from '@/components/brand/BrandMark';

// nodejs 런타임의 @vercel/og 번들이 Windows에서 기본 폰트 경로를 잘못 만들어
// "Invalid URL"로 빌드가 깨지는 알려진 버그(vercel/next.js#77164)가 있어 edge로 돌린다.
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** 파비콘 - 헤더/푸터와 동일한 BrandMark(방패+3인 실루엣)를 그대로 재사용한다.
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
          color: 'white',
        }}
      >
        <BrandMark width={20} height={20} />
      </div>
    ),
    { ...size, fonts }
  );
}
