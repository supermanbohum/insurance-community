'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createAdminCommentAction } from '@/lib/actions/comments-admin';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 운영팀 공식 댓글 작성 폼(W-085) - OfficialPostForm과 동일한 원칙. */
export function AdminCommentForm({ posts }: { posts: { id: string; title: string }[] }) {
  const router = useRouter();
  const [postId, setPostId] = useState(posts[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!postId || !content.trim()) {
      toast.error('글과 댓글 내용을 모두 입력해주세요.');
      return;
    }
    setIsPending(true);
    const result = await createAdminCommentAction({ postId, content });
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('댓글이 등록되었습니다.');
    setContent('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>글 선택</Label>
        <Select value={postId} onValueChange={setPostId}>
          <SelectTrigger>
            <SelectValue placeholder="댓글을 달 글을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {posts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ac-content">댓글 내용</Label>
        <Textarea id="ac-content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>

      <p className="rounded-md border border-dashed border-line bg-surface-sunken px-3 py-2 text-xs text-ink-faint">
        &ldquo;보험맵 운영팀&rdquo; 명의로 즉시 공개됩니다(심사 대기 없음). 글 목록에는 공개(visible) 상태인 글만 표시됩니다.
      </p>

      <Button type="submit" disabled={isPending || !postId}>
        {isPending ? '등록 중...' : '댓글 등록하기'}
      </Button>
    </form>
  );
}
