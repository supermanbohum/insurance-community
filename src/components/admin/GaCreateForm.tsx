'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createGaCompanyAction } from '@/lib/actions/ga-admin';
import { AddressSearchField, type AddressValue } from '@/components/admin/AddressSearchField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function GaCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ceoName, setCeoName] = useState('');
  const [phone, setPhone] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [isHeadquarters, setIsHeadquarters] = useState(true);
  const [operationType, setOperationType] = useState<'direct' | 'branch'>('branch');
  const [description, setDescription] = useState('');
  const [addressValue, setAddressValue] = useState<AddressValue>({
    address: '',
    addressDetail: '',
    zonecode: '',
    lat: null,
    lng: null,
  });

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
        phone,
        homepageUrl,
        isHeadquarters,
        operationType,
        address: addressValue.address,
        addressDetail: addressValue.addressDetail,
        zonecode: addressValue.zonecode,
        lat: addressValue.lat ?? undefined,
        lng: addressValue.lng ?? undefined,
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
            <p className="text-xs text-muted-foreground">/ga/{slug || '...'} 로 노출됩니다.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-ceo">대표자명</Label>
            <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-phone">대표번호</Label>
              <Input id="ga-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-homepage">홈페이지</Label>
              <Input id="ga-homepage" value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="https://" />
            </div>
          </div>

          <AddressSearchField value={addressValue} onChange={setAddressValue} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>운영 형태</Label>
              <Select value={operationType} onValueChange={(v) => setOperationType(v as 'direct' | 'branch')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">직영</SelectItem>
                  <SelectItem value="branch">지사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>본사 여부</Label>
              <div className="flex h-9 items-center gap-2">
                <Switch checked={isHeadquarters} onCheckedChange={setIsHeadquarters} />
                <span className="text-sm text-muted-foreground">{isHeadquarters ? '본사' : '본사 아님'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-desc">회사 소개</Label>
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
