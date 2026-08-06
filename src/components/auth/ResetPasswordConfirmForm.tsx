'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** 새 비밀번호 설정 - /auth/reset-password-callback이 확립해둔 복구 세션을 사용해
 * updateUser로 비밀번호를 바꾼 뒤, 깔끔한 재로그인을 위해 세션을 정리하고 /login으로
 * 보낸다(복구 세션 상태로 계속 진행시키지 않는다). */
export function ResetPasswordConfirmForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error('비밀번호를 변경하지 못했습니다. 재설정 링크가 만료되었을 수 있습니다.');
        return;
      }
      await supabase.auth.signOut();
      toast.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      router.push('/login');
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rpc-password">새 비밀번호</Label>
        <Input id="rpc-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rpc-password-confirm">새 비밀번호 확인</Label>
        <Input
          id="rpc-password-confirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <Button type="submit" disabled={isPending || !password || !passwordConfirm} size="lg">
        {isPending ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </form>
  );
}
