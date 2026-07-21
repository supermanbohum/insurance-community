import Link from 'next/link';

export default function MyPostsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <p className="text-sm text-gray-500">내 활동 기능은 준비 중입니다.</p>
      <Link href="/" className="mt-4 inline-block text-sm text-brand-700 underline">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
