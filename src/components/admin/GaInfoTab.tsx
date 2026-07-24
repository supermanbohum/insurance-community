'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2, UploadCloud } from 'lucide-react';
import { updateGaCompanyAction, uploadGaLogoAction } from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LOGO_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos`;

function GaLogoCard({ ga }: { ga: GaCompanyRow }) {
  const [logoPath, setLogoPath] = useState(ga.logo_path);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setIsUploading(true);
    const formData = new FormData();
    formData.set('logo', file);
    uploadGaLogoAction(ga.id, formData)
      .then(async (result) => {
        if (!result.success || !result.path) {
          toast.error(!result.success ? result.error : '업로드하지 못했습니다.');
          return;
        }
        const saveResult = await updateGaCompanyAction(ga.id, { logoPath: result.path });
        if (saveResult.success) {
          setLogoPath(result.path);
          toast.success('로고를 업로드했습니다.');
        } else {
          toast.error(saveResult.error);
        }
      })
      .finally(() => setIsUploading(false));
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, { logoPath: '' });
      if (result.success) {
        setLogoPath(null);
        toast.success('로고를 삭제했습니다.');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">로고</CardTitle>
        <CardDescription>지점 상세페이지 상단에 노출됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {logoPath ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${LOGO_BASE_URL}/${logoPath}`}
              alt="GA 로고"
              className="h-16 w-16 rounded-md border object-cover"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={isPending} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              로고 삭제
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground hover:border-muted-foreground/50"
          >
            <UploadCloud className="h-6 w-6" />
            <p className="text-sm font-medium">{isUploading ? '업로드 중...' : '로고 업로드'}</p>
            <p className="text-xs">클릭해서 선택 (jpg/png/webp, 2MB 이하)</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** GA는 이제 회사 정보/로고/브랜드 소개만 갖는 상위 엔티티다 - 주소/연락처/SNS/교육/복지/채용 등
 * 실제 운영에 관한 필드는 전부 지점(Branch) 수정 화면에서 관리한다. */
export interface GaInfoDraft {
  name: string;
  ceoName: string;
  description: string;
}

export function GaInfoTab({
  ga,
  onDraftChange,
}: {
  ga: GaCompanyRow;
  onDraftChange?: (draft: GaInfoDraft) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(ga.name);
  const [ceoName, setCeoName] = useState(ga.ceo_name ?? '');
  const [description, setDescription] = useState(ga.description ?? '');

  useEffect(() => {
    onDraftChange?.({ name, ceoName, description });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, ceoName, description]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, { name, ceoName, description });
      if (result.success) toast.success('저장되었습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <GaLogoCard ga={ga} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-name">GA명</Label>
        <Input id="ga-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>slug</Label>
        <Input value={ga.slug} disabled />
        <p className="text-xs text-muted-foreground">내부 식별용이며, 생성 후 변경할 수 없습니다.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-ceo">대표자명</Label>
        <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-desc">브랜드 소개</Label>
        <Textarea id="ga-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '저장 중...' : '저장'}
      </Button>
      </form>
    </div>
  );
}
