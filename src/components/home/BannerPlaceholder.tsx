import { ShieldCheck } from 'lucide-react';

export function BannerPlaceholder() {
  return (
    <div className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-5 shadow-pop sm:h-36">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex max-w-[75%] flex-col gap-1.5">
        <span className="flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
          <ShieldCheck className="h-3 w-3" />
          검증된 GA 정보
        </span>
        <p className="text-base font-extrabold leading-snug text-white sm:text-lg">
          믿을 수 있는 GA,
          <br />
          보험맵에서 한눈에
        </p>
      </div>
    </div>
  );
}
