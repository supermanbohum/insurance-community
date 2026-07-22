'use client';

import { Phone, Globe, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

function directionsHref(name: string, address: string | null, lat: number | null, lng: number | null): string | null {
  if (lat !== null && lng !== null) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  }
  if (address) return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
  return null;
}

export function GaStickyActionBar({
  name,
  address,
  lat,
  lng,
  phone,
  homepageUrl,
  variant,
}: {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  homepageUrl: string | null;
  variant: 'public' | 'preview';
}) {
  const directions = directionsHref(name, address, lat, lng);

  const buttons = [
    phone
      ? { key: 'phone', label: '전화하기', icon: Phone, href: `tel:${phone.replace(/[^0-9+]/g, '')}`, external: false, primary: true }
      : null,
    directions ? { key: 'directions', label: '길찾기', icon: Navigation, href: directions, external: true, primary: false } : null,
    homepageUrl
      ? {
          key: 'homepage',
          label: '홈페이지',
          icon: Globe,
          href: /^https?:\/\//.test(homepageUrl) ? homepageUrl : `https://${homepageUrl}`,
          external: true,
          primary: false,
        }
      : null,
  ].filter((b): b is NonNullable<typeof b> => b !== null);

  if (buttons.length === 0) return null;

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
          buttons.length === 3 ? 'grid-cols-3' : buttons.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
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
              onClick={variant === 'preview' ? (e) => e.preventDefault() : undefined}
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
