import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SPEC-016 ⑨ - 검색·지역·필터·지도 0건 공용 컴포넌트. "없습니다" 단문으로 끝내지
 * 않고 지점장에게 "지금 등록하면 첫 결과가 된다"는 기회로 반전시킨다(광고 A축
 * "검색하면 안 나옵니다"의 제품 내 완결). 점선 테두리 금지, 항상 중앙 정렬.
 *
 * compact=true는 지도 사이드바/바텀시트처럼 공간이 좁은 곳 전용 - 아이콘·오너
 * 넛지 박스 없이 한 줄 문구 + 텍스트 CTA만 남긴다.
 */
export function EmptyBranchResults({
  title,
  nudge = '이 지역 지점장이신가요? 지금 등록하면 이 검색의 첫 결과가 됩니다',
  registerHref = '/register',
  secondaryAction,
  compact = false,
}: {
  title: string;
  nudge?: string;
  registerHref?: string;
  secondaryAction?: { label: string; href: string };
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="px-2 py-6 text-center text-sm text-ink-faint">
        {title}{' '}
        <Link href={registerHref} className="font-bold text-brand-600 hover:underline">
          지점 등록하기
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-11 text-center">
      <span className="flex h-11 w-11 items-center justify-center text-ink-faint">
        <MapPin className="h-11 w-11" strokeWidth={1.5} />
      </span>
      <h3 className="text-[17px] font-bold text-ink">{title}</h3>
      <p className="mt-1 rounded-xl bg-surface-sunken px-5 py-3.5 text-[13px] text-ink-soft">{nudge}</p>
      <div className="mt-1 flex items-center justify-center gap-2.5">
        <Button asChild size="lg">
          <Link href={registerHref}>지점 등록하기</Link>
        </Button>
        {secondaryAction && (
          <Button asChild variant="outline" size="lg">
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
