'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { sendAdminTestPushAction } from '@/lib/actions/push-test-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminPushTestForm() {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('보험맵 테스트 알림');
  const [body, setBody] = useState('푸시 파이프라인이 정상 작동합니다.');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendAdminTestPushAction(title, body);
      if (result.success) {
        toast.success('발송했습니다. 본인 기기 알림을 확인해주세요.');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="push-test-title">제목</Label>
        <Input id="push-test-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="push-test-body">내용</Label>
        <Input id="push-test-body" value={body} onChange={(e) => setBody(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '발송 중...' : '내 기기로 테스트 발송'}
      </Button>
    </form>
  );
}
