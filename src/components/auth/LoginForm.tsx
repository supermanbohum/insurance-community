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
  const { loginWithEmail, isPending } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

      <p className="flex items-center justify-center gap-2 text-xs text-ink-faint">
        <Link href="/find-id" className="hover:underline">
          아이디 찾기
        </Link>
        <span className="h-3 w-px bg-line" />
        <Link href="/reset-password" className="hover:underline">
          비밀번호 찾기
        </Link>
      </p>

      <p className="text-center text-xs text-ink-faint">
        아직 계정이 없으신가요?{' '}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600 hover:underline">
          일반 회원가입
        </Link>
      </p>
    </div>
  );
}
