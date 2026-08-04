import Link from 'next/link';
import { Megaphone, MessageSquareText, Plus, UserPlus } from 'lucide-react';
import type { HomeStats } from '@/lib/public/branch';
import { StatCountUp } from '@/components/home/StatCountUp';

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
export function HomeRegisterHero({ stats, ctaLabel = '지점 등록하기' }: { stats: HomeStats; ctaLabel?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/partner/register"
          className="group relative flex animate-breathe items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 py-7 shadow-pop transition-shadow hover:shadow-card-hover active:scale-[0.99]"
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
          <Plus className="relative h-6 w-6 text-white" strokeWidth={2.5} />
          <span className="relative text-xl font-extrabold tracking-tight text-white">{ctaLabel}</span>
        </Link>
        <Link
          href="/planner-market/register"
          className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 py-7 shadow-pop transition-shadow hover:shadow-card-hover active:scale-[0.99]"
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
          <UserPlus className="relative h-6 w-6 text-white" strokeWidth={2.5} />
          <span className="relative text-xl font-extrabold tracking-tight text-white">설계사 등록하기</span>
        </Link>
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

      <div className="flex items-center justify-between rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3">
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
          📍 등록 지점 <span className="text-brand-600"><StatCountUp value={stats.branchCount} /></span>개
        </span>
        <span className="h-3.5 w-px shrink-0 bg-line" />
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
          👨‍💼 등록 설계사 <span className="text-brand-600"><StatCountUp value={stats.plannerTotal} /></span>명
        </span>
        <span className="h-3.5 w-px shrink-0 bg-line" />
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
          🔥 오늘 신규 <span className="text-brand-600"><StatCountUp value={stats.todayCount} /></span>건
        </span>
      </div>
    </div>
  );
}
