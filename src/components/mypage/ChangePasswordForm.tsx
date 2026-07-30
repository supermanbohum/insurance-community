'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { changePasswordAction } from '@/lib/actions/user-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await changePasswordAction(current, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('비밀번호가 변경되었습니다.');
      setCurrent('');
      setNext('');
      setConfirm('');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">비밀번호 변경</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-current">현재 비밀번호</Label>
            <Input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-next">새 비밀번호</Label>
            <Input id="cp-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-confirm">새 비밀번호 확인</Label>
            <Input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {confirm.length > 0 && next !== confirm && <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>}
          </div>
          <Button type="submit" disabled={isPending || !canSubmit} className="self-start">
            변경하기
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
