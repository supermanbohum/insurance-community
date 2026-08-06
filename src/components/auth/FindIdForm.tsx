'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'email' | 'code' | 'result';

/** 아이디 찾기 - 이미 가입확인 메일 발송에 쓰이는 Supabase 이메일 OTP 인프라를
 * 그대로 재사용한다(새 이메일 발송 연동 불필요). 이메일 소유를 인증코드로 증명해야만
 * 아이디를 알려주며, 조회 직후 임시로 생긴 세션은 즉시 로그아웃해 부작용을 막는다. */
export function FindIdForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) {
        toast.error('인증코드 발송에 실패했습니다. 가입된 이메일인지 확인해주세요.');
        return;
      }
      toast.success('인증코드를 발송했습니다. 이메일을 확인해주세요.');
      setStep('code');
    });
  }

  function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (verifyError) {
        toast.error('인증코드가 올바르지 않거나 만료되었습니다.');
        return;
      }
      const { data, error: lookupError } = await supabase.rpc('get_username_by_verified_email');
      await supabase.auth.signOut();
      if (lookupError || !data) {
        toast.error('등록된 아이디를 찾을 수 없습니다. 고객센터에 문의해주세요.');
        return;
      }
      setUsername(data);
      setStep('result');
    });
  }

  if (step === 'result') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
          <p className="text-sm text-brand-700">회원님의 아이디는</p>
          <p className="mt-1 text-xl font-extrabold text-brand-800">{username}</p>
          <p className="text-sm text-brand-700">입니다</p>
        </div>
        <Button asChild size="lg">
          <Link href="/login">로그인하러 가기</Link>
        </Button>
        <p className="text-center text-xs text-ink-faint">
          <Link href="/reset-password" className="hover:underline">
            비밀번호를 잊으셨나요?
          </Link>
        </p>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-3">
        <p className="text-xs text-ink-faint">{email}로 발송된 인증코드를 입력해주세요.</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fi-code">인증코드</Label>
          <Input id="fi-code" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <Button type="submit" disabled={isPending || !code.trim()} size="lg">
          {isPending ? '확인 중...' : '확인'}
        </Button>
        <button
          type="button"
          onClick={() => setStep('email')}
          className="text-center text-xs text-ink-faint hover:underline"
        >
          이메일 다시 입력하기
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fi-email">가입 시 등록한 이메일</Label>
        <Input id="fi-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isPending || !email.trim()} size="lg">
        {isPending ? '발송 중...' : '인증코드 받기'}
      </Button>
    </form>
  );
}
