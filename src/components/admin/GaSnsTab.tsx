'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateGaCompanyAction } from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface GaSnsDraft {
  blogUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  kakaoChannelUrl: string;
  openChatUrl: string;
}

export function GaSnsTab({ ga, onDraftChange }: { ga: GaCompanyRow; onDraftChange?: (draft: GaSnsDraft) => void }) {
  const [isPending, startTransition] = useTransition();
  const [blogUrl, setBlogUrl] = useState(ga.sns_blog_url ?? '');
  const [instagramUrl, setInstagramUrl] = useState(ga.sns_instagram_url ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(ga.sns_youtube_url ?? '');
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState(ga.sns_kakao_channel_url ?? '');
  const [openChatUrl, setOpenChatUrl] = useState(ga.sns_open_chat_url ?? '');

  useEffect(() => {
    onDraftChange?.({ blogUrl, instagramUrl, youtubeUrl, kakaoChannelUrl, openChatUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogUrl, instagramUrl, youtubeUrl, kakaoChannelUrl, openChatUrl]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, {
        snsBlogUrl: blogUrl,
        snsInstagramUrl: instagramUrl,
        snsYoutubeUrl: youtubeUrl,
        snsKakaoChannelUrl: kakaoChannelUrl,
        snsOpenChatUrl: openChatUrl,
      });
      if (result.success) toast.success('저장되었습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-blog">블로그</Label>
        <Input id="sns-blog" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} placeholder="https://blog.naver.com/..." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-instagram">인스타그램</Label>
        <Input id="sns-instagram" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-youtube">유튜브</Label>
        <Input id="sns-youtube" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@..." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-kakao">카카오채널</Label>
        <Input id="sns-kakao" value={kakaoChannelUrl} onChange={(e) => setKakaoChannelUrl(e.target.value)} placeholder="https://pf.kakao.com/..." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-openchat">오픈채팅</Label>
        <Input id="sns-openchat" value={openChatUrl} onChange={(e) => setOpenChatUrl(e.target.value)} placeholder="https://open.kakao.com/o/..." />
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
