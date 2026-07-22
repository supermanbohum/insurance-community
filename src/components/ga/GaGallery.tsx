import { ImageOff } from 'lucide-react';
import type { GaMediaItem } from '@/components/ga/types';

export function GaGallery({ banner, gallery }: { banner: GaMediaItem | null; gallery: GaMediaItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl bg-surface-sunken">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.url} alt="대표 배너" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint">
            <ImageOff className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-sm">등록된 배너가 없습니다</span>
          </div>
        )}
      </div>

      {gallery.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {gallery.slice(0, 8).map((item) => (
            <div key={item.id} className="group aspect-square overflow-hidden rounded-xl bg-surface-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt="갤러리 사진"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
