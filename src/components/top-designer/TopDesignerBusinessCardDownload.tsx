'use client';

import { useRef, useState } from 'react';
import { User, Download } from 'lucide-react';
import { toast } from 'sonner';
import { STAR_TIER_LABEL, type StarTier } from '@/lib/top-designer/labels';
import { Button } from '@/components/ui/button';
import { avatarGradient, cn } from '@/lib/utils';

/** 명함 다운로드 - 별도 서버 렌더링 인프라 없이, 화면에 그려둔 명함 DOM을
 * html2canvas로 캡처해 PNG로 저장한다(이 코드베이스에 이미지/PDF 생성 인프라가
 * 전혀 없어 새로 추가한 유일한 의존성). */
export function TopDesignerBusinessCardDownload({
  name,
  starTier,
  regionLabel,
  careerYears,
  profilePhotoUrl,
  seed,
}: {
  name: string;
  starTier: StarTier;
  regionLabel: string;
  careerYears: number;
  profilePhotoUrl: string | null;
  seed: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function download() {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `${name}-보험맵-명함.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast.error('명함 이미지를 만들지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={cardRef}
        className="relative flex w-full max-w-[340px] flex-col gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-5 text-white shadow-pop"
      >
        <div className="flex items-center gap-3">
          <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br', avatarGradient(seed))}>
            {profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6 text-white/85" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">보험맵 공식 인증</p>
            <p className="text-lg font-extrabold">{STAR_TIER_LABEL[starTier]}</p>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-bold">{name}</p>
          <p className="text-sm text-white/70">
            {regionLabel} · 경력 {careerYears}년
          </p>
        </div>
        <p className="mt-2 text-right text-[11px] font-semibold tracking-wide text-white/50">bohummap.com</p>
      </div>
      <Button type="button" variant="outline" disabled={isDownloading} onClick={download} className="gap-1.5">
        <Download className="h-4 w-4" />
        {isDownloading ? '생성 중...' : '명함 다운로드'}
      </Button>
    </div>
  );
}
