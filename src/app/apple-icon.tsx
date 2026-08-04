import { ImageResponse } from 'next/og';
import { loadOgFonts } from '@/lib/seo/ogFonts';
import { BrandMark } from '@/components/brand/BrandMark';

// icon.tsx와 동일한 이유(vercel/next.js#77164)로 edge 런타임을 쓴다.
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS 홈 화면 추가(apple-touch-icon) 전용 - icon.tsx와 동일한 BrandMark를 180x180으로 재사용한다. */
export default async function AppleIcon() {
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
          color: 'white',
        }}
      >
        <BrandMark width={112} height={112} />
      </div>
    ),
    { ...size, fonts }
  );
}
