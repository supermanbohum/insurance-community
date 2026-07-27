'use client';

import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

export function LoginForm() {
  const { login, isPending } = useAuth();

  async function handleGoogleLogin() {
    const result = await login('google');
    if (!result.success) {
      toast.error(result.error ?? '로그인하지 못했습니다.');
    }
    // 성공 시에는 provider 로그인 화면으로 리다이렉트되므로 여기서 할 일이 없다.
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3.5 text-sm font-bold text-ink shadow-card transition-colors hover:bg-surface-sunken disabled:opacity-60"
      >
        <span className="text-base font-black text-brand-600">G</span>
        Google로 시작하기
      </button>
    </div>
  );
}
