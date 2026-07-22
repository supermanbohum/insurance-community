'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createGaCompanyAction } from '@/lib/actions/ga-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { slugify } from '@/lib/utils';

/** GA는 이제 회사 정보/로고/브랜드 소개만 갖는 상위 엔티티다 - 주소/연락처/SNS/교육/복지 등은
 * 전부 지점(Branch) 등록 화면에서 입력한다(지점마다 다를 수 있으므로). */
export function GaCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ceoName, setCeoName] = useState('');
  const [description, setDescription] = useState('');

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !name.trim()) {
      toast.error('GA명과 slug를 입력해주세요.');
      return;
    }
    startTransition(async () => {
      const result = await createGaCompanyAction({
        slug,
        name,
        ceoName,
        description,
      });
      if (result.success && result.gaCompanyId) {
        toast.success(`${name} GA가 등록되었습니다.`);
        router.push(`/admin/ga/${result.gaCompanyId}`);
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <p className="text-xs text-muted-foreground">내부 식별용 slug입니다(공개 페이지 없음).</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-ceo">대표자명</Label>
            <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-desc">브랜드 소개</Label>
            <Textarea id="ga-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? '생성 중...' : 'GA 생성'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
