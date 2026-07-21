'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { updateGaCompanyAction, uploadGaLogoAction, verifyGaCompanyAction } from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function GaEditForm({ ga, logoUrl }: { ga: GaCompanyRow; logoUrl: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setUploadingLogo] = useState(false);
  const [name, setName] = useState(ga.name);
  const [ceoName, setCeoName] = useState(ga.ceo_name ?? '');
  const [description, setDescription] = useState(ga.description ?? '');
  const [logoPath, setLogoPath] = useState(ga.logo_path);
  const [previewUrl, setPreviewUrl] = useState(logoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoSelect(file: File | undefined) {
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.set('logo', file);
    uploadGaLogoAction(ga.id, formData)
      .then((result) => {
        if (result.success && result.path) {
          setLogoPath(result.path);
          setPreviewUrl(URL.createObjectURL(file));
          toast.success('로고를 업로드했습니다. 저장을 눌러 반영하세요.');
        } else if (!result.success) {
          toast.error(result.error);
        }
      })
      .finally(() => setUploadingLogo(false));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, {
        name,
        ceoName,
        description,
        logoPath: logoPath ?? undefined,
      });
      if (result.success) {
        toast.success('저장되었습니다.');
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleVerifyToggle(checked: boolean) {
    startTransition(async () => {
      const result = await verifyGaCompanyAction(ga.id, checked);
      if (result.success) {
        toast.success(checked ? '공식 인증 배지를 부여했습니다.' : '공식 인증 배지를 해제했습니다.');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              <AvatarImage src={previewUrl ?? undefined} alt={name} className="object-cover" />
              <AvatarFallback className="rounded-lg">{name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleLogoSelect(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" disabled={isUploadingLogo} onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                {isUploadingLogo ? '업로드 중...' : '로고 변경'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-name">GA명</Label>
            <Input id="ga-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>slug</Label>
            <Input value={ga.slug} disabled />
            <p className="text-xs text-muted-foreground">slug은 생성 후 변경할 수 없습니다.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-ceo">대표자명</Label>
            <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga-desc">회사 소개</Label>
            <Textarea id="ga-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">공식 인증 GA</CardTitle>
          <CardDescription>승인 상태와는 별개의 신뢰 배지입니다. GA 상세페이지에 노출됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch checked={ga.is_verified} onCheckedChange={handleVerifyToggle} disabled={isPending} />
            <span className="text-sm">{ga.is_verified ? '인증됨' : '미인증'}</span>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
