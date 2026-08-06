'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User, Eye, Heart } from 'lucide-react';
import type { PublicTopDesignerCardSummary } from '@/lib/public/top-designer.supabase';
import { STAR_TIER_LABEL } from '@/lib/top-designer/labels';
import { avatarGradient, cn } from '@/lib/utils';

export function TopDesignerCard({ designer, className }: { designer: PublicTopDesignerCardSummary; className?: string }) {
  const href = `/top-designer/${designer.id}`;
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-card-hover',
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
        {designer.profilePhotoUrl ? (
          <Image
            src={designer.profilePhotoUrl}
            alt="TOP 설계사 프로필 사진"
            fill
            loading="lazy"
            sizes="(min-width: 1024px) 220px, 45vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85', avatarGradient(designer.id))}>
            <User className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-amber-600 shadow">
          {STAR_TIER_LABEL[designer.starTier]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-sm font-semibold text-ink">
          {designer.activeRegionLabel || '지역 미상'} · 경력 {designer.careerYears}년
        </p>
        {designer.specialties.length > 0 && <p className="truncate text-xs text-ink-soft">{designer.specialties.join(', ')}</p>}
        {designer.selfIntroduction && <p className="line-clamp-2 text-xs text-ink-faint">{designer.selfIntroduction}</p>}
        <div className="mt-auto flex items-center gap-3 pt-1 text-[11px] text-ink-faint">
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" /> {designer.viewCount}
          </span>
          <span className="flex items-center gap-0.5">
            <Heart className="h-3 w-3" /> {designer.likeCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
