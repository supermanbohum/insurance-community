import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <p className="text-sm text-gray-500">
        {query ? (
          <>
            <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span>에 대한 검색 기능은 준비 중입니다.
          </>
        ) : (
          '검색 기능은 준비 중입니다.'
        )}
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-brand-700 underline">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
