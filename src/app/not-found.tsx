import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { NotFoundContent } from '@/components/seo/NotFoundContent';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false, follow: true },
};

/**
 * 루트 not-found - (main) 레이아웃(헤더/푸터) 밖의 완전히 매칭되지 않는 경로에서만
 * 쓰인다. (main) 하위 페이지의 notFound()는 (main)/not-found.tsx가 먼저 잡아서 헤더/
 * 푸터가 있는 채로 보여준다 - 여기는 그 chrome 자체가 없는 경우의 최후 폴백이라 최소
 * 로고만 얹는다.
 */
export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center py-6">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink">보험맵</span>
        </Link>
      </div>
      <NotFoundContent />
    </div>
  );
}
