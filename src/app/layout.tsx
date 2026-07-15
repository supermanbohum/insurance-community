import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { SITE_CONFIG } from '@/lib/config/site';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: SITE_CONFIG.name,
  description: SITE_CONFIG.description,
  metadataBase: new URL(SITE_CONFIG.url),
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    locale: 'ko_KR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: SITE_CONFIG.themeColor,
};

async function getNavCategories() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('categories')
    .select('slug, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getNavCategories();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <DesktopNav categories={categories} />
        <MobileTopBar categories={categories} />
        <main className="pb-mobile-nav w-full">{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
