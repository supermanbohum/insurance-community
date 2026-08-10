'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Link2, Plus } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { useKakaoShare } from '@/lib/kakao/useKakaoShare';
import { SITE_URL } from '@/lib/seo/config';
import { recordBranchPlannerGateEventAction } from '@/lib/actions/branch-planner-registrations';

/** 지점 미연결 하드 게이트(오너 승인, 콘텐츠 확정본, 2026-08-10) - "막는 화면"이 아니라
 * "전환 화면"이다(CTO 지시). 설계사가 검색해도 소속 지점이 없으면, 본인이 지점장인
 * 경우와 설계사인 경우 두 갈래로 다음 행동을 준다. 설계사마켓 링크는 넣지 않는다
 * (오너가 명시적으로 기각 - 막힌 자리에서 마켓으로 보내면 두 시스템이 다시 섞인다).
 *
 * 카카오톡 전달은 오늘 만든 useKakaoShare 훅(a593c19, 지점 상세 공유와 동일 로직)을
 * 그대로 재사용한다 - 콘텐츠가 "카카오 공유 훅 재사용"이라고 명시했다. */
export function BranchPlannerGate() {
  const [copied, setCopied] = useState(false);
  const forwardUrl = `${SITE_URL}/register`;
  const { share, isPending } = useKakaoShare({
    title: '보험맵에 우리 지점을 등록해주세요',
    description: '설계사님이 보험맵에서 지점을 찾고 있어요. 지금 등록하면 이 지역 1호 자리와 6개월 무료를 함께 가져갑니다.',
    imageUrl: `${SITE_URL}/opengraph-image`,
    url: forwardUrl,
  });

  function handleForward() {
    recordBranchPlannerGateEventAction('forward_click');
    share();
  }

  async function handleCopyLink() {
    recordBranchPlannerGateEventAction('forward_click');
    await navigator.clipboard.writeText(forwardUrl);
    setCopied(true);
    toast.success('링크를 복사했습니다.');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-5">
      <p className="text-sm font-bold leading-relaxed text-ink">
        등록이 안 되는 게 아니라, 순서가 하나 남았습니다.
        <br />
        지점 페이지가 먼저 만들어져야, 그 지점의 설계사로 등록할 수 있습니다.
      </p>

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink-soft">
          지점을 운영하고 계신가요? 지금 등록하면 이 지역 1호 자리와 6개월 무료를 함께 가져갑니다.
        </p>
        <HeroCtaButton
          href="/register"
          label="우리 지점 먼저 등록하기"
          icon={<Plus className="h-5 w-5" strokeWidth={2.5} />}
          gradientClassName="from-brand-500 via-brand-600 to-brand-800"
          glowColor="rgba(37,99,235,0.45)"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink-soft">
          지점장님께 한 줄만 전해주세요. 지점이 등록되는 순간, 설계사님 등록도 바로 이어집니다.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleForward}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FEE500] px-4 py-2.5 text-[13px] font-bold text-[#3C1E1E] transition-colors hover:brightness-95 disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />
            카카오톡으로 전달하기
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            <Link2 className="h-4 w-4" />
            {copied ? '복사됨' : '링크 복사'}
          </button>
        </div>
      </div>
    </div>
  );
}
