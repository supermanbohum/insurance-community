import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/my');
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <ShieldCheck className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">보험맵 로그인</h1>
        <p className="text-sm text-ink-faint">즐겨찾기, 리뷰 등 회원 전용 기능을 사용해보세요.</p>
      </div>

      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
