import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';

const PIN_POSITIONS = [
  { top: '28%', left: '22%', delay: '0s' },
  { top: '52%', left: '48%', delay: '0.15s' },
  { top: '38%', left: '72%', delay: '0.3s' },
  { top: '68%', left: '30%', delay: '0.45s' },
];

export function MapPreviewSection() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-[17px] font-extrabold tracking-tight text-ink">지도로 한눈에</h2>
        <p className="mt-0.5 text-xs text-ink-faint">내 주변 GA 지점을 지도에서 찾아보세요</p>
      </div>

      <Link
        href="/region"
        className="group relative flex h-40 w-full items-end overflow-hidden rounded-2xl border border-line bg-surface-sunken shadow-card transition-all hover:shadow-card-hover sm:h-48"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(#e6eaf2 1px, transparent 1px), linear-gradient(90deg, #e6eaf2 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden
        />
        {PIN_POSITIONS.map((pos, i) => (
          <span
            key={i}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop"
            style={{ top: pos.top, left: pos.left, animationDelay: pos.delay }}
          >
            <MapPin className="h-4 w-4" strokeWidth={2.5} />
          </span>
        ))}

        <div className="relative z-10 flex w-full items-center justify-between gap-2 bg-gradient-to-t from-white/95 via-white/70 to-transparent p-4">
          <span className="text-sm font-bold text-ink">지역별 GA 지점 보기</span>
          <span className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-transform group-hover:translate-x-0.5">
            지도에서 보기
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
