import type { Metadata } from 'next';
import Link from 'next/link';

// 준비 중인 빈 placeholder라 검색결과에 노출되면 얇은 콘텐츠(thin content)로
// 취급될 수 있다 - 실제 기능이 나오기 전까지는 색인에서 제외한다.
export const metadata: Metadata = {
  title: '베스트 게시글',
  robots: { index: false, follow: true },
};

export default function BestPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <p className="text-sm text-ink-faint">베스트 게시글 기능은 준비 중입니다.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand-600 underline">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
