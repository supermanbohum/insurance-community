'use client';

import { Phone, MessageCircle, Navigation } from 'lucide-react';
import { recordBranchContactClickAction } from '@/lib/actions/public';
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
    phone
      ? {
          key: 'phone',
          label: '전화하기',
          icon: Phone,
          href: `tel:${phone.value.replace(/[^0-9+]/g, '')}`,
          onClick: () => void recordBranchContactClickAction(phone.id),
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
          onClick: () => void recordBranchContactClickAction(kakao.id),
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
        variant === 'public' && 'fixed inset-x-0 bottom-[72px] px-4 lg:static lg:bottom-auto lg:px-0'
      )}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-2xl gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card',
          buttons.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
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
