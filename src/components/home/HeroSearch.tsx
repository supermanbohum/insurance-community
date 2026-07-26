import Link from 'next/link';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { SearchCombobox } from '@/components/search/SearchCombobox';

export function HeroSearch() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-ink">보험맵</h1>
            <p className="text-[11px] font-medium leading-tight text-ink-faint">지도에서 찾는 전국 보험 GA</p>
          </div>
        </div>
        <Link
          href="/partner/signup"
          className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-ink-faint transition-colors hover:text-brand-600"
        >
          GA이신가요?
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <SearchCombobox
        placeholder="지역, GA명, 지점명 검색"
        inputClassName="w-full rounded-full border border-line bg-white py-3.5 pl-11 pr-4 text-base text-ink shadow-card outline-none ring-0 transition-shadow placeholder:text-ink-faint focus:shadow-card-hover"
        navigateOnFocus
      />
    </div>
  );
}
