import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { SITE_CONFIG } from '@/lib/config/site';
import { SITE_URL, DEFAULT_META_DESCRIPTION, getVerificationMeta } from '@/lib/seo/config';
import { Toaster } from '@/components/ui/sonner';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-sans',
  display: 'swap',
});

// 페이지별 <title>이 없을 때의 최종 폴백 + 하위 페이지 제목 포맷("○○ | 보험맵")의
// 공통 템플릿. 각 페이지는 title: '페이지 제목'만 넘기면 자동으로 "페이지 제목 | 보험맵"이 된다.
export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} | 전국 보험대리점 정보 플랫폼`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: DEFAULT_META_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE_CONFIG.name,
    description: DEFAULT_META_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_CONFIG.name,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  verification: getVerificationMeta(),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: SITE_CONFIG.themeColor,
};

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : null;

/**
 * 최소 루트 레이아웃. 공개 페이지 chrome(헤더/하단탭)은 (main)/layout.tsx,
 * 관리자 chrome은 admin/layout.tsx, ga-admin/layout.tsx가 각자 담당한다.
 * <head>의 preconnect는 metadata API가 다루지 않는 영역이라 직접 렌더링한다 - 지점
 * 사진/로고를 나르는 Supabase Storage와 지도 페이지의 네이버 지도 타일 서버를
 * 미리 연결해 초기 이미지/지도 로딩 지연을 줄인다.
 * Toaster(sonner)는 모든 라우트(공개/파트너/관리자)가 공유하므로 여기 한 곳에만 마운트한다 -
 * 하위 레이아웃에 각자 또 마운트하면 토스트가 중복 렌더링된다.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <head>
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        <link rel="preconnect" href="https://oapi.map.naver.com" />
        <link rel="preconnect" href="https://nrbe.pstatic.net" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
