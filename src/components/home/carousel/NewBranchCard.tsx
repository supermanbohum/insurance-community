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
        {/* 🔴 두 소개는 서로 다른 문구다(오너 확정 2026-08-12).
              지점명 오른쪽  short_tagline  작게 · 9자 이내 · 선택 입력
              지점명 아래    tagline        원래 자리 · 길이 제한 그대로
            자른 것이 아니라 따로 받는다 - 같은 말이 두 번 보이면 오른쪽에 넣을 이유가 없다.
            🔴 short_tagline이 없으면 오른쪽을 그냥 비운다. 대체 텍스트·placeholder 금지 -
            오너가 지적한 게 "오른쪽이 비어 보인다"였는데 빈 요소를 그리면 그대로 남는다.
            ⚠️ 한 번 실패한 자리다: tagline을 오른쪽으로 옮겼더니 190px 카드에서 5글자만
            보였다. 짧은 문구를 따로 받는 게 그 결론이다. */}
        <p className="flex items-baseline gap-1 text-[15px] font-bold text-ink">
          <span className="min-w-0 max-w-[65%] shrink-0 truncate">{branch.name}</span>
          {branch.shortTagline && (
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-brand-600">
              {branch.shortTagline}
            </span>
          )}
        </p>
        {branch.tagline && (
          <p className="truncate text-[11px] font-medium text-brand-600">✨ {branch.tagline}</p>
        )}
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
