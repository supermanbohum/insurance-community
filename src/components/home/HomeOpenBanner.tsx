import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import type { HomeOpenBannerRow } from '@/lib/admin/home-banner';

/** PROMO_PLAN §3 - 8/17 09:00에 문구 하나만 바뀌는 오픈 카운트다운 배너. 관리자
 * 패널(home_open_banner, 0079)에서 편집하므로 재배포 없이 즉시 전환된다. */
export function HomeOpenBanner({ banner }: { banner: HomeOpenBannerRow | null }) {
  if (!banner || !banner.isActive) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Megaphone className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink">{banner.headline}</p>
        {banner.subtext && <p className="mt-0.5 truncate text-[12px] text-ink-soft">{banner.subtext}</p>}
      </div>
      <Link href={banner.ctaHref} className="shrink-0 text-[13px] font-bold text-brand-600 hover:underline">
        {banner.ctaLabel}
      </Link>
    </div>
  );
}
