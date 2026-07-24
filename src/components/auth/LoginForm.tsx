'use client';

import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const { login, isPending } = useAuth();

  async function handleOneClick(provider: 'kakao' | 'google') {
    const result = await login(provider);
    if (!result.success) {
      toast.error(result.error ?? '로그인하지 못했습니다.');
    }
    // 성공 시에는 provider 로그인 화면으로 리다이렉트되므로 여기서 할 일이 없다.
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => handleOneClick('kakao')}
        disabled={isPending}
        className={cn(
          'flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition-opacity disabled:opacity-60',
          'bg-[#FEE500] text-[#3C1E1E]'
        )}
      >
        <MessageCircle className="h-4 w-4" fill="#3C1E1E" strokeWidth={0} />
        카카오로 시작하기
      </button>

      <button
        type="button"
        onClick={() => handleOneClick('google')}
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-surface-sunken disabled:opacity-60"
      >
        <span className="text-base font-black text-brand-600">G</span>
        Google로 시작하기
      </button>
    </div>
  );
}
