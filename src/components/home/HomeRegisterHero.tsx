import Link from 'next/link';
import { Megaphone, MessageSquareText, Plus, UserPlus } from 'lucide-react';
import type { HomeStats } from '@/lib/public/branch';
import { StatCountUp } from '@/components/home/StatCountUp';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';

/**
 * 헤더에 이미 로고+검색창이 있어(BohomMapHeader) 예전 HeroSearch가 그걸 그대로
 * 반복하고 있었다 - 그 자리를 "지점을 등록하고 싶은 사람"과 "설계사로 등록하고
 * 싶은 사람"을 위한 동일 비중의 큰 CTA 2개 + "지금 서비스가 살아있다"는 걸
 * 보여주는 정보 영역으로 바꾼다.
 *
 * TOP설계사 등록 버튼은 메인에서 완전히 제거했다(햄버거 메뉴 "인증" 그룹으로
 * 이동, BohomMapHeader.tsx 참고) - TOP설계사 기능 자체(DB/API/관리자)는 그대로
 * 유지되며 이 설계사 등록(리크루팅) 시스템과는 절대 혼용하지 않는다.
 */
export function HomeRegisterHero({ stats, ctaLabel = '우리 지점 등록하기' }: { stats: HomeStats; ctaLabel?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HeroCtaButton
          href="/partner/register"
          label={ctaLabel}
          icon={<Plus className="h-6 w-6" strokeWidth={2.5} />}
          gradientClassName="from-brand-500 via-brand-600 to-brand-800"
          glowColor="rgba(37,99,235,0.45)"
        />
        <HeroCtaButton
          href="/planner-market/register"
          label="설계사 등록하기"
          icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
          gradientClassName="from-indigo-500 via-violet-600 to-violet-800"
          glowColor="rgba(124,58,237,0.45)"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/board/notice"
          className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-white py-3.5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <Megaphone className="h-4 w-4 text-slate-500" />
          <span className="text-[11px] font-bold text-ink-soft">공지사항</span>
        </Link>
        <Link
          href="/board/review"
          className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-white py-3.5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <MessageSquareText className="h-4 w-4 text-brand-500" />
          <span className="text-[11px] font-bold text-ink-soft">실시간 후기</span>
        </Link>
      </div>

      {/* 지점/설계사 수 대신 GA 법인 수를 노출한다(W-031) - 큐레이션된 마스터 데이터라
          시드 정리 같은 이벤트로 "1개/0명"처럼 초라해지지 않는 안정적인 지표다. */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3 sm:flex sm:items-center sm:justify-between">
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
          🏢 전국 GA 법인 <span className="text-brand-600"><StatCountUp value={stats.gaCount} /></span>개
        </span>
        <span className="hidden h-3.5 w-px shrink-0 bg-line sm:block" />
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
          🔥 오늘 신규 <span className="text-brand-600"><StatCountUp value={stats.todayCount} /></span>건
        </span>
        <span className="hidden h-3.5 w-px shrink-0 bg-line sm:block" />
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
          👣 오늘 방문자 <span className="text-brand-600"><StatCountUp value={stats.todayVisitorCount} /></span>명
        </span>
      </div>
    </div>
  );
}
