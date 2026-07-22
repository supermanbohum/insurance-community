import { ShieldCheck } from 'lucide-react';
import { SearchCombobox } from '@/components/search/SearchCombobox';

export function HeroSearch() {
  return (
    <div className="relative flex w-full flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-5 py-7 shadow-pop sm:px-7 sm:py-9">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <span className="flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
          <ShieldCheck className="h-3 w-3" />
          검증된 GA 정보
        </span>
        <div>
          <h1 className="text-xl font-extrabold leading-snug text-white sm:text-2xl">보험맵</h1>
          <p className="mt-1 text-sm font-medium text-white/85 sm:text-base">
            전국 보험 GA를 쉽고 빠르게 찾으세요.
          </p>
        </div>

        <SearchCombobox
          placeholder="지역, GA명, 지점명 검색"
          inputClassName="w-full rounded-full border-0 bg-white py-3 pl-10 pr-4 text-sm text-ink shadow-card outline-none ring-0 transition-shadow placeholder:text-ink-faint focus:shadow-card-hover"
          navigateOnFocus
        />
      </div>
    </div>
  );
}
