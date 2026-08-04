'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { extendBranchAdProductAction } from '@/lib/actions/ad-products-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 광고 기간 연장 - 승인됨/만료됨 상태에서만 가능(RPC에서 검증). */
export function AdProductExtendDialog({ adProductId, currentEndAt }: { adProductId: string; currentEndAt: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [newEndAt, setNewEndAt] = useState(isoToLocalInput(currentEndAt));

  function submit() {
    if (!newEndAt) return;
    startTransition(async () => {
      const result = await extendBranchAdProductAction(adProductId, new Date(newEndAt).toISOString());
      if (result.success) {
        toast.success('연장되었습니다.');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          기간 연장
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>광고 기간 연장</DialogTitle>
          <DialogDescription>새 종료일시를 입력해주세요.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-extend-end">새 종료일시</Label>
          <Input id="ad-extend-end" type="datetime-local" value={newEndAt} onChange={(e) => setNewEndAt(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={isPending || !newEndAt} onClick={submit}>
            연장 적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
