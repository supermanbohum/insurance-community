'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** 비밀번호 찾기 - 아이디를 입력하면 기존 get_email_by_username RPC(로그인에서 이미
 * 쓰는 것과 동일)로 이메일을 알아낸 뒤, Supabase 표준 resetPasswordForEmail로 재설정
 * 링크를 발송한다. 이메일을 직접 입력해도 그대로 사용한다. */
export function ResetPasswordRequestForm() {
  const [idOrEmail, setIdOrEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idOrEmail.trim()) return;
    startTransition(async () => {
      const supabase = createClient();
      const input = idOrEmail.trim();
      let email = input;

      if (!input.includes('@')) {
        const { data, error } = await supabase.rpc('get_email_by_username', { p_username: input });
        if (error || !data) {
          toast.error('존재하지 않는 아이디입니다.');
          return;
        }
        email = data;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password-callback`,
      });
      if (resetError) {
        toast.error('재설정 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
        <p className="text-sm font-bold text-brand-700">메일을 발송했습니다</p>
        <p className="mt-1 text-sm text-brand-700">메일함에서 링크를 눌러 새 비밀번호를 설정해주세요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rp-id">아이디 또는 이메일</Label>
        <Input id="rp-id" value={idOrEmail} onChange={(e) => setIdOrEmail(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isPending || !idOrEmail.trim()} size="lg">
        {isPending ? '발송 중...' : '재설정 메일 받기'}
      </Button>
    </form>
  );
}
