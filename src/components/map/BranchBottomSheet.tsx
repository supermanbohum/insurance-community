'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Briefcase, Building2, ChevronRight, MapPin, MessageCircle, Navigation, X } from 'lucide-react';
import { avatarGradient, cn } from '@/lib/utils';
import type { MapBranch } from './types';

function directionsHref(branch: MapBranch): string {
  if (branch.lat != null && branch.lng != null) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(branch.name)},${branch.lat},${branch.lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(branch.address)}`;
}

/** 모바일 지도 화면 전용 - 마커를 누르면 아래에서 올라오는 정보창. 위로 드래그하면 상세 정보가 펼쳐진다. */
export function BranchBottomSheet({ branch, onClose }: { branch: MapBranch; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  useEffect(() => {
    setExpanded(false);
  }, [branch.id]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const delta = e.clientY - startYRef.current;
    const THRESHOLD = 36;
    if (delta < -THRESHOLD) setExpanded(true);
    else if (delta > THRESHOLD) {
      if (expanded) setExpanded(false);
      else onClose();
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-t-3xl border-t border-line bg-white shadow-2xl transition-[max-height] duration-300 ease-out',
        expanded ? 'max-h-[68vh]' : 'max-h-[168px]'
      )}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="h-1 w-10 rounded-full bg-line" />
      </div>

      <div className="flex items-center gap-3 px-4 pb-3 pt-2.5">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
          {branch.mainImageUrl ? (
            <Image src={branch.mainImageUrl} alt={branch.name} fill loading="lazy" sizes="56px" className="object-cover" />
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85',
                avatarGradient(branch.gaCompanyName + branch.name)
              )}
            >
              <Building2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[11px] font-medium text-ink-faint">
            {branch.isGaVerified && <BadgeCheck className="h-3 w-3 shrink-0 text-brand-500" />}
            <span className="truncate">{branch.gaCompanyName}</span>
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                branch.operationType === 'direct' ? 'bg-gold-50 text-gold-600' : 'bg-surface-sunken text-ink-soft'
              )}
            >
              {branch.operationType === 'direct' ? '직영' : '지사'}
            </span>
          </p>
          <p className="truncate text-sm font-bold text-ink">{branch.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-faint">
            <span className="flex min-w-0 items-center gap-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{branch.sidoName ? `${branch.sidoName} ${branch.sigunguName ?? ''}` : branch.address}</span>
            </span>
            {branch.hasActiveRecruit && (
              <span className="flex shrink-0 items-center gap-0.5 font-semibold text-brand-600">
                <Briefcase className="h-3 w-3" />
                채용중
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-sunken"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5">
          <p className="text-[13px] leading-relaxed text-ink-soft">{branch.address}</p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/branch/${branch.slug}`}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-brand-600 py-3 text-[13px] font-bold text-white active:bg-brand-700"
            >
              <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
              상세보기
            </Link>
            {branch.kakaoContactHref && (
              <a
                href={branch.kakaoContactHref}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#FEE500] py-3 text-[13px] font-bold text-[#3C1E1E] active:opacity-80"
              >
                <MessageCircle className="h-[18px] w-[18px]" fill="#3C1E1E" strokeWidth={0} />
                카카오 문의
              </a>
            )}
            <a
              href={directionsHref(branch)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white py-3 text-[13px] font-bold text-ink-soft active:bg-surface-sunken"
            >
              <Navigation className="h-[18px] w-[18px]" strokeWidth={2.25} />
              길찾기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
