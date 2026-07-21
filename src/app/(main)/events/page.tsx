import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

export default function EventsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 py-20 text-center text-gray-400">
      <CalendarDays className="h-8 w-8" />
      <p className="text-sm">이벤트 기능은 준비 중입니다.</p>
      <Link href="/" className="mt-2 text-sm text-brand-700 underline">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
