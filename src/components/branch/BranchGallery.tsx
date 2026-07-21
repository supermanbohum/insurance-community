import { Video as VideoIcon, ImageOff, Play } from 'lucide-react';
import type { BranchMediaItem } from '@/components/branch/types';

export function BranchGallery({ media }: { media: BranchMediaItem[] }) {
  const main = media.find((m) => m.type === 'image_main');
  const office = media.filter((m) => m.type === 'image_office');
  const video = media.find((m) => m.type === 'video');
  const total = media.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-sunken sm:aspect-video">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={main.url} alt="대표사진" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint">
            <ImageOff className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-sm">등록된 대표사진이 없습니다</span>
          </div>
        )}
        {main && total > 1 && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            1 / {total}
          </span>
        )}
      </div>

      {(office.length > 0 || video) && (
        <div className="grid grid-cols-4 gap-2">
          {office.slice(0, 3).map((item) => (
            <div key={item.id} className="group aspect-square overflow-hidden rounded-xl bg-surface-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt="사무실사진"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          ))}
          {video && (
            <a
              href={video.source === 'external' ? video.url : undefined}
              target={video.source === 'external' ? '_blank' : undefined}
              rel="noreferrer"
              className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-ink text-white"
            >
              {video.source === 'storage' ? (
                <video src={video.url} className="absolute inset-0 h-full w-full object-cover opacity-50" muted />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-ink to-ink/70" />
              )}
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:scale-110">
                <Play className="h-4 w-4 fill-white" strokeWidth={0} />
              </span>
              <VideoIcon className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-white/80" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
