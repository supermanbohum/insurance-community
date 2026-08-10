'use client';

import { Share2 } from 'lucide-react';
import { useKakaoShare } from '@/lib/kakao/useKakaoShare';
import { cn } from '@/lib/utils';

/**
 * 카카오톡 공유(Kakao.Share) 버튼(오너 지시, 2026-08-10) - 사용자가 공유창에서
 * 직접 받는 사람을 선택하는 방식이라 카카오 심사가 필요 없다(talk_message처럼
 * 우리 서버가 친구 목록을 받아 발송하는 것과는 다른 기능 - CTO가 최초에 혼동했던
 * 지점이 바로 이 둘의 차이다).
 *
 * 기본 피드형 템플릿(sendDefault)만 쓴다 - 커스텀 템플릿(빌더 등록)은 나중 범위.
 * 각 페이지가 이미 가진 OG 메타데이터(title/description/image)를 그대로 재사용해
 * 새로 만들지 않는다. 로그인 여부와 무관하게 항상 노출한다(공유는 인증이 필요한
 * 행위가 아니다 - 즐겨찾기 버튼과 다른 지점).
 */
export function KakaoShareButton({
  title,
  description,
  imageUrl,
  url,
  className,
}: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  className?: string;
}) {
  const { share, isPending } = useKakaoShare({ title, description, imageUrl, url });

  return (
    <button
      type="button"
      onClick={share}
      disabled={isPending}
      aria-label="카카오톡으로 공유하기"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-faint shadow-card transition-colors hover:border-[#FEE500] hover:bg-[#FEE500]/10 hover:text-[#3C1E1E]',
        className
      )}
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}
