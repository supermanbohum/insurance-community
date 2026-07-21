'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { createGaCompanyAction } from '@/lib/actions/ga-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function GaCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ceoName, setCeoName] = useState('');
  const [description, setDescription] = useState('');

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function reset() {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setCeoName('');
    setDescription('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createGaCompanyAction({ slug, name, ceoName, description });
      if (result.success) {
        toast.success(`${name} GA가 등록되었습니다.`);
        setOpen(false);
        reset();
        if (result.gaCompanyId) {
          router.push(`/admin/ga/${result.gaCompanyId}`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          GA 생성
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>GA 생성</DialogTitle>
            <DialogDescription>새 GA는 &lsquo;심사중&rsquo; 상태로 생성되며, 승인 후 공개됩니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-name">GA명 *</Label>
              <Input id="ga-name" value={name} onChange={(e) => handleNameChange(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-slug">slug *</Label>
              <Input
                id="ga-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">/ga/{slug || '...'} 로 노출됩니다.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-ceo">대표자명</Label>
              <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-desc">회사 소개</Label>
              <Textarea id="ga-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
