'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createOfficialPostAction } from '@/lib/actions/posts-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 운영팀 공식 글 발행 폼(W-027) - 마크다운 원문을 그대로 붙여넣으면 된다(별도 렌더링
 * 컴포넌트 없이 공개 화면에서 whitespace-pre-wrap으로 그대로 보여준다, W-027 지시서의
 * "관리자에서 마크다운 붙여넣기" 요구사항 - 서식 변환이 아니라 발행 마찰을 없애는 게 목적). */
export function OfficialPostForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !title.trim() || !content.trim()) {
      toast.error('카테고리, 제목, 본문을 모두 입력해주세요.');
      return;
    }
    setIsPending(true);
    const result = await createOfficialPostAction({ categoryId, title, content, sourceUrl });
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('발행되었습니다.');
    router.push(`/post/${result.postId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>카테고리</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="카테고리 선택" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="op-title">제목</Label>
        <Input id="op-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="op-content">본문(마크다운 원문을 그대로 붙여넣으면 됩니다)</Label>
        <Textarea id="op-content" rows={16} value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="op-source">출처 링크 (선택)</Label>
        <Input id="op-source" type="url" placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      </div>

      <p className="rounded-md border border-dashed border-line bg-surface-sunken px-3 py-2 text-xs text-ink-faint">
        &ldquo;보험맵 운영팀&rdquo; 명의로 즉시 공개 발행됩니다(심사 대기 없음). 하단 고지 문구는 자동으로 붙습니다.
      </p>

      <Button type="submit" disabled={isPending}>
        {isPending ? '발행 중...' : '발행하기'}
      </Button>
    </form>
  );
}
