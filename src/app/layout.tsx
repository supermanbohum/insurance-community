import type { Metadata } from 'next';
import './globals.css';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: SITE_CONFIG.name,
  description: SITE_CONFIG.description,
  metadataBase: new URL(SITE_CONFIG.url),
  openGraph: {
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <DesktopNav />
        <main className="pb-mobile-nav mx-auto min-h-screen max-w-board lg:max-w-4xl">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
