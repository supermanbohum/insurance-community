import { ImageResponse } from 'next/og';
import { getPublicBranchDetail } from '@/lib/public/branch';
import { BranchOgImage } from '@/lib/seo/ogImageContent';
import { loadOgFonts } from '@/lib/seo/ogFonts';

// nodejs 런타임의 @vercel/og 번들이 Windows에서 기본 폰트 경로를 잘못 만들어
// "Invalid URL"로 빌드가 깨지는 알려진 버그(vercel/next.js#77164)가 있어 edge로 돌린다.
export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const [branch, fonts] = await Promise.all([
    getPublicBranchDetail(decodeURIComponent(params.slug)),
    loadOgFonts(),
  ]);
  const mainPhoto = branch?.media.find((m) => m.type === 'image_main')?.url ?? null;
  return new ImageResponse(<BranchOgImage photoUrl={mainPhoto} />, { ...size, fonts });
}
