import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/seo/NotFoundContent';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundContent />;
}
