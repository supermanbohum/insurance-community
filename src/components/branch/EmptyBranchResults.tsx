import Link from 'next/link';
import { MapPin, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SPEC-038 - 지점 0건 빈 상태 공용 컴포넌트(SPEC-016 ⑨를 대체).
 *
 * 🔴 0건은 한 종류가 아니다. 원인이 다르면 사용자가 할 일도 다르므로 문장·아이콘·
 * 버튼이 서로 달라야 한다. 같은 화면을 세 곳에 돌려쓰면 사용자가 자기 상황
 * (데이터가 없는 건지 / 내 검색어가 안 맞는 건지 / 필터를 너무 좁힌 건지)을 구분하지
 * 못한다. 그래서 icon을 필수로 받는다 - 세 호출부가 같은 아이콘을 쓰면 그 자체가 버그다.
 *
 * 🔴 문구 규칙(콘텐츠조 확정): "보실 수 있습니다 / 확인할 수 있습니다" 계열 금지.
 * 데이터가 0인 상태에서는 전부 거짓이다(전국으로 넓혀도 0, 필터를 지워도 0).
 * "등록하실 수 있습니다"만 참이다. 여기에 문구를 추가할 때 이 규칙을 지킬 것.
 *
 * compact=true는 지도 사이드바처럼 공간이 좁은 곳 전용 - 한 줄 문구 + 텍스트 링크만.
 */
const ICONS = { pin: MapPin, building: Building2, search: Search } as const;

export function EmptyBranchResults({
  icon,
  title,
  description,
  primaryAction = { label: '우리 지점 등록하기', href: '/register' },
  secondaryAction,
  /** 필터가 걸린 0건에서는 "조건 완화"가 1순위 해법이라 보조 버튼을 solid로 올린다. */
  emphasize = 'primary',
  compact = false,
}: {
  icon: keyof typeof ICONS;
  title: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  emphasize?: 'primary' | 'secondary';
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="px-2 py-6 text-center text-sm text-ink-faint">
        {title}{' '}
        <Link href={primaryAction.href} className="font-bold text-brand-600 hover:underline">
          {primaryAction.label}
        </Link>
      </p>
    );
  }

  const Icon = ICONS[icon];

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-11 text-center">
      <span className="flex h-12 w-12 items-center justify-center text-ink-faint">
        <Icon className="h-12 w-12" strokeWidth={1.5} />
      </span>
      <h3 className="text-[17px] font-bold text-ink">{title}</h3>
      {description && <p className="max-w-[30rem] text-[13px] leading-relaxed text-ink-soft">{description}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
        {/* 강조 대상만 solid. 버튼 2개가 모두 solid면 무엇을 먼저 눌러야 할지 사라진다. */}
        <Button asChild size="lg" variant={emphasize === 'primary' ? 'default' : 'outline'}>
          <Link href={primaryAction.href}>{primaryAction.label}</Link>
        </Button>
        {secondaryAction && (
          <Button asChild size="lg" variant={emphasize === 'secondary' ? 'default' : 'outline'}>
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
