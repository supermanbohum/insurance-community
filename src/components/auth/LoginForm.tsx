'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// /signup 페이지(app/(main)/signup/page.tsx)의 KAKAO_SIGNUP_ENABLED와 반드시 같은
// 플래그다 - 배포 게이트(CTO, 2026-08-08: /privacy 카카오 조항·종단 재로그인 확인·
// FAQ 문구 치환)가 끝나기 전까지는 false로 유지한다. 하나만 켜면 카카오로 가입한
// 사람이 로그인을 못 하는 잠금 사고가 난다.
const KAKAO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === 'true';

export function LoginForm({ next = '/my' }: { next?: string }) {
  const router = useRouter();
  const { login, loginWithEmail, isPending } = useAuth();
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

  async function handleKakaoLogin() {
    const result = await login('kakao', next);
    if (!result.success) {
      toast.error(result.error ?? '카카오 로그인에 실패했습니다.');
    }
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

      {KAKAO_LOGIN_ENABLED && (
        <>
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            또는
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] py-3 text-sm font-bold text-[#191600] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            카카오로 시작하기
          </button>
        </>
      )}

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
