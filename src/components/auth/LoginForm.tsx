'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const router = useRouter();
  const { login, isPending } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');

  async function handleOneClick(provider: 'kakao' | 'google') {
    const result = await login(provider);
    if (result.success) {
      toast.success('로그인되었습니다.');
      router.push('/');
    } else {
      toast.error(result.error ?? '로그인하지 못했습니다.');
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await login('email', { email, nickname: nickname || undefined });
    if (result.success) {
      toast.success('로그인되었습니다.');
      router.push('/');
    } else {
      toast.error(result.error ?? '로그인하지 못했습니다.');
    }
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

      {!showEmailForm ? (
        <button
          type="button"
          onClick={() => setShowEmailForm(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface-sunken px-4 py-3.5 text-sm font-bold text-ink-soft transition-colors hover:bg-line"
        >
          <Mail className="h-4 w-4" />
          이메일로 로그인 / 회원가입
        </button>
      ) : (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">이메일</Label>
            <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-nickname">닉네임 (선택)</Label>
            <Input id="login-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="보험맵 회원" />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? '로그인 중...' : '이메일로 계속하기'}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-ink-faint">
        지금은 실제 소셜 로그인 없이 클릭 한 번으로 체험할 수 있는 임시 로그인입니다.
      </p>
    </div>
  );
}
