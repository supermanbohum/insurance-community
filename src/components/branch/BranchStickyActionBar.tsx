'use client';

import { Phone, MessageCircle, MessageSquare, Navigation } from 'lucide-react';
import { recordBranchContactClickAction } from '@/lib/actions/public';
import { triggerHaptic } from '@/lib/native/haptics';
import type { BranchContactItem } from '@/components/branch/types';
import { cn } from '@/lib/utils';

function directionsHref(name: string, address: string, lat: number | null, lng: number | null): string {
  if (lat !== null && lng !== null) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

export function BranchStickyActionBar({
  name,
  address,
  lat,
  lng,
  contacts,
  variant,
}: {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  contacts: BranchContactItem[];
  variant: 'public' | 'preview';
}) {
  const phone = contacts.find((c) => c.type === 'phone');
  const kakao = contacts.find((c) => c.type === 'kakao');

  const buttons = [
    // 🔴 연락처가 하나도 없는 지점(= 연락처 미공개)에는 그 자리에 「문의하기」를 둔다.
    // 문의 폼은 후기 아래 맨 끝의 「연락처」 섹션 안에 있어서 상단에서 아주 멀다 -
    // 액션바에서 바로 데려가지 않으면 방문자는 그런 폼이 있는지도 모른다.
    // 조건이 `contacts.length === 0`인 이유: 문의 폼 자체가 그때만 렌더된다
    // (BranchContactList). 연락처가 하나라도 있으면 「문의하기」가 데려갈 폼이 없어서
    // 라벨이 거짓말이 된다.
    contacts.length === 0
      ? {
          key: 'inquiry',
          label: '문의하기',
          icon: MessageSquare,
          // ResponsiveSection이 섹션마다 `section-<key>` id를 붙인다(연락처 = contacts).
          href: '#section-contacts',
          onClick: (e: React.MouseEvent) => {
            const target = document.getElementById('section-contacts');
            if (!target) return; // id가 없으면 기본 앵커 이동에 맡긴다
            e.preventDefault();
            triggerHaptic('medium');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
          external: false,
          primary: true,
        }
      : null,
    phone
      ? {
          key: 'phone',
          label: '전화하기',
          icon: Phone,
          href: `tel:${phone.value.replace(/[^0-9+]/g, '')}`,
          onClick: () => {
            triggerHaptic('medium');
            void recordBranchContactClickAction(phone.id);
          },
          external: false,
          primary: true,
        }
      : null,
    kakao
      ? {
          key: 'kakao',
          label: '카카오',
          icon: MessageCircle,
          href: /^https?:\/\//.test(kakao.value) ? kakao.value : `https://${kakao.value}`,
          onClick: () => {
            triggerHaptic('medium');
            void recordBranchContactClickAction(kakao.id);
          },
          external: true,
          primary: false,
        }
      : null,
    {
      key: 'directions',
      label: '길찾기',
      icon: Navigation,
      href: directionsHref(name, address, lat, lng),
      onClick: undefined,
      external: true,
      primary: false,
    },
  ].filter((b): b is NonNullable<typeof b> => b !== null);

  return (
    <div
      className={cn(
        'z-30 flex gap-2',
        variant === 'public' &&
          'fixed inset-x-0 bottom-0 bg-white/95 px-4 pb-[max(theme(spacing.3),env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:static lg:bottom-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none'
      )}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-2xl gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card',
          // 🔴 예전에는 3개가 아니면 무조건 grid-cols-2였다. 길찾기 하나뿐인 지점은
          // 오른쪽 칸이 그냥 **빈칸**으로 남았다(포항지점에서 오너가 직접 지적).
          // 버튼 수 = 칸 수. Tailwind JIT가 클래스를 정적으로 찾아야 하므로
          // `grid-cols-${n}` 템플릿이 아니라 완성된 문자열로 적는다.
          buttons.length === 1 && 'grid-cols-1',
          buttons.length === 2 && 'grid-cols-2',
          buttons.length >= 3 && 'grid-cols-3',
          variant === 'public' && 'shadow-2xl lg:shadow-card'
        )}
      >
        {buttons.map((btn) => {
          const Icon = btn.icon;
          return (
            <a
              key={btn.key}
              href={variant === 'preview' ? undefined : btn.href}
              target={btn.external ? '_blank' : undefined}
              rel="noreferrer"
              onClick={variant === 'preview' ? (e) => e.preventDefault() : btn.onClick}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-3 text-[13px] font-bold transition-colors',
                btn.primary ? 'bg-brand-600 text-white active:bg-brand-700' : 'bg-white text-ink-soft active:bg-surface-sunken'
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
              {btn.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
