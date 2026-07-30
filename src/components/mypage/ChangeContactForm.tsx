'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateContactAction } from '@/lib/actions/ga-change-request';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ChangeContactForm({ currentContact }: { currentContact: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [contact, setContact] = useState(currentContact ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    startTransition(async () => {
      const result = await updateContactAction(contact);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('연락처가 변경되었습니다.');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">연락처 변경</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-contact">연락처</Label>
            <Input id="cc-contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
          </div>
          <Button type="submit" disabled={isPending || !contact.trim() || contact.trim() === currentContact} className="self-start">
            변경하기
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
