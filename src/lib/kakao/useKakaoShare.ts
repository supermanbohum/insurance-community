'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { loadKakaoSdk } from '@/lib/kakao/loadKakaoSdk';

export interface KakaoShareContentInput {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}

/** Kakao.Share.sendDefault 호출 로직 - KakaoShareButton(지점 상세)과 전역 공유
 * 버튼(홈/햄버거)이 동일하게 재사용한다. 콘텐츠(title/description/imageUrl/url)만
 * 호출부가 다르게 넘긴다. */
export function useKakaoShare({ title, description, imageUrl, url }: KakaoShareContentInput) {
  const [isPending, setIsPending] = useState(false);

  async function share() {
    setIsPending(true);
    try {
      const Kakao = await loadKakaoSdk();
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '자세히 보기', link: { mobileWebUrl: url, webUrl: url } }],
      });
    } catch (err) {
      console.error('[useKakaoShare] 공유 실패', err);
      toast.error('카카오톡 공유를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsPending(false);
    }
  }

  return { share, isPending };
}
