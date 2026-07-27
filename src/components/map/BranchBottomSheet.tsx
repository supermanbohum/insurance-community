'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Briefcase, Building2, ChevronRight, Eye, MapPin, MessageCircle, Navigation, X } from 'lucide-react';
import { avatarGradient, cn } from '@/lib/utils';
import type { MapBranch } from './types';

function directionsHref(branch: MapBranch): string {
  if (branch.lat != null && branch.lng != null) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(branch.name)},${branch.lat},${branch.lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(branch.address)}`;
}

type SheetLevel = 0 | 1 | 2;
const LEVEL_MAX_HEIGHT: Record<SheetLevel, string> = {
  0: '56px',
  1: '168px',
  2: '68vh',
};

/** 모바일 지도 화면 전용 - 마커를 누르면 아래에서 올라오는 정보창. 애플 지도처럼
 * 최소/보통/전체 3단계 높이로 위아래 드래그해 전환할 수 있다. */
export function BranchBottomSheet({ branch, onClose }: { branch: MapBranch; onClose: () => void }) {
  const [level, setLevel] = useState<SheetLevel>(1);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  useEffect(() => {
    setLevel(1);
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
    const THRESHOLD = 32;
    if (delta < -THRESHOLD) {
      setLevel((v) => (Math.min(2, v + 1) as SheetLevel));
    } else if (delta > THRESHOLD) {
      if (level === 0) onClose();
      else setLevel((v) => (Math.max(0, v - 1) as SheetLevel));
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-t-3xl border-t border-line bg-white shadow-2xl transition-[max-height] duration-300 ease-out"
      style={{ maxHeight: LEVEL_MAX_HEIGHT[level] }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => setLevel((v) => (v === 2 ? 1 : ((v + 1) as SheetLevel)))}
      >
        <span className="h-1 w-10 rounded-full bg-line" />
      </div>

      {level === 0 ? (
        <div className="flex items-center gap-2 px-4 py-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{branch.name}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-sunken"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
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
      )}

      {level === 2 && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5">
          <p className="text-[13px] leading-relaxed text-ink-soft">{branch.address}</p>

          {/* 조회수/문의수는 이미 집계되는 값 - 후기/즐겨찾기 수는 추후 기능이 붙으면 이 줄에 이어서 추가한다. */}
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              조회 {branch.viewCount.toLocaleString('ko-KR')}
            </span>
            {branch.contactClickCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                문의 {branch.contactClickCount.toLocaleString('ko-KR')}
              </span>
            )}
          </div>

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
