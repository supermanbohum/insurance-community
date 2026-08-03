'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ next = '/my' }: { next?: string }) {
  const router = useRouter();
  const { login, loginWithEmail, isPending } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleGoogleLogin() {
    const result = await login('google', next);
    if (!result.success) {
      toast.error(result.error ?? '로그인하지 못했습니다.');
    }
    // 성공 시에는 provider 로그인 화면으로 리다이렉트되므로 여기서 할 일이 없다.
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    const result = await loginWithEmail(username.trim(), password);
    if (!result.success) {
      toast.error(result.error ?? '로그인하지 못했습니다.');
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lf-username">아이디</Label>
          <Input id="lf-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lf-password">비밀번호</Label>
          <Input id="lf-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" disabled={isPending || !username.trim() || !password} size="lg">
          {isPending ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <p className="text-center text-xs text-ink-faint">
        아직 계정이 없으신가요?{' '}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600 hover:underline">
          일반 회원가입
        </Link>
      </p>

      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        또는
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3.5 text-sm font-bold text-ink shadow-card transition-colors hover:bg-surface-sunken disabled:opacity-60"
      >
        <span className="text-base font-black text-brand-600">G</span>
        Google로 간편 시작하기
      </button>
      <p className="text-center text-[11px] text-ink-faint">구글 로그인은 탐색 전용이며, 채팅·지점등록 등은 일반 회원가입이 필요합니다.</p>
    </div>
  );
}
