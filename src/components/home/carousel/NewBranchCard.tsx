import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MapPin, Building2 } from 'lucide-react';
import type { PublicBranchSummary } from '@/types/database';
import { avatarGradient, cn } from '@/lib/utils';
import { SafeBranchImage } from '@/components/shared/SafeBranchImage';

export function NewBranchCard({ branch }: { branch: PublicBranchSummary }) {
  return (
    <Link
      href={`/branch/${branch.slug}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
        {branch.mainImageUrl ? (
          <SafeBranchImage src={branch.mainImageUrl} alt={branch.name} sizes="220px" className="object-cover" />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85',
              avatarGradient(branch.gaCompanyName + branch.name)
            )}
          >
            <Building2 className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          NEW
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-3 pt-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-[10px] font-bold text-brand-600">
          {branch.gaCompanyLogoUrl ? (
            <Image src={branch.gaCompanyLogoUrl} alt={branch.gaCompanyName} width={24} height={24} className="h-full w-full object-cover" />
          ) : (
            branch.gaCompanyName.slice(0, 2)
          )}
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink-faint">{branch.gaCompanyName}</p>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-1.5">
        {/* 🔴 한 줄 소개는 지점명 "오른쪽 같은 줄"이다(오너 지시 2026-08-11).
            아래 줄로 내리지 말 것 - 오너가 지적한 것이 지점명 옆의 빈 공간이었다.
            폭 배분: 지점명이 우선이라 최대 65%까지 가져가고, 소개가 남은 자리를 받아
            좁으면 말줄임된다. 🔴 둘 다 truncate를 유지할 것 - 한쪽만 주면 긴 지점명일 때
            반대쪽이 폭 0으로 밀려 통째로 사라진다.
            🔴 소개가 없으면 요소 자체를 렌더하지 않는다. 빈 요소를 두면 오너가 지적한
            "오른쪽이 비어 있다"가 그대로 남는다. */}
        <p className="flex items-baseline gap-1 text-[15px] font-bold text-ink">
          <span className="min-w-0 max-w-[65%] shrink-0 truncate">{branch.name}</span>
          {branch.tagline && (
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-brand-600">
              ✨ {branch.tagline}
            </span>
          )}
        </p>
        <div className="flex items-center justify-between gap-1.5">
          <span className="flex min-w-0 items-center gap-1 truncate rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium text-ink-soft">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{branch.sidoName ? `${branch.sidoName} ${branch.sigunguName ?? ''}` : '전국'}</span>
          </span>
          <span className="shrink-0 text-[11px] text-ink-faint">
            {formatDistanceToNow(new Date(branch.createdAt), { addSuffix: true, locale: ko })}
          </span>
        </div>
      </div>
    </Link>
  );
}
