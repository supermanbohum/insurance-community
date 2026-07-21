'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { closeBranchRecruitAction, createBranchRecruitAction } from '@/lib/actions/branch-admin';
import type { BranchRecruitRow } from '@/lib/admin/branch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const EMPLOYMENT_TYPES = ['정규직', '위촉직', '계약직'];

export function BranchRecruitTab({ branchId, recruits }: { branchId: string; recruits: BranchRecruitRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createBranchRecruitAction({ branchId, title, content, employmentType });
      if (result.success) {
        toast.success('채용공고를 등록했습니다.');
        setTitle('');
        setContent('');
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleClose(recruitId: string) {
    startTransition(async () => {
      const result = await closeBranchRecruitAction(recruitId, branchId);
      if (result.success) toast.success('마감 처리했습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 p-0">
          {recruits.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">등록된 채용공고가 없습니다.</p>
          ) : (
            recruits.map((recruit) => (
              <div key={recruit.id} className="flex items-center justify-between gap-3 border-b p-3 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{recruit.title}</p>
                    <Badge variant={recruit.is_active ? 'success' : 'secondary'}>
                      {recruit.is_active ? '모집중' : '마감'}
                    </Badge>
                  </div>
                  {recruit.employment_type && (
                    <p className="text-xs text-muted-foreground">{recruit.employment_type}</p>
                  )}
                </div>
                {recruit.is_active && (
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleClose(recruit.id)}>
                    마감
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>고용 형태</Label>
              <div className="flex gap-1.5">
                {EMPLOYMENT_TYPES.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={employmentType === t ? 'default' : 'outline'}
                    onClick={() => setEmploymentType(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recruit-title">제목</Label>
              <Input id="recruit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recruit-content">내용</Label>
              <Textarea id="recruit-content" value={content} onChange={(e) => setContent(e.target.value)} rows={4} required />
            </div>
            <Button type="submit" disabled={isPending} className="self-start">
              {isPending ? '등록 중...' : '채용공고 등록'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
