import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Building2 } from 'lucide-react';
import { listPublicGaCompanies } from '@/lib/public/ga';

export async function CompanyQuickLinks() {
  const companies = await listPublicGaCompanies({});
  if (companies.length === 0) return null;

  const ordered = [...companies].sort((a, b) => b.branchCount - a.branchCount).slice(0, 12);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">🏢 회사별로 찾기</h2>
          <p className="mt-0.5 text-xs text-ink-faint">등록된 GA사를 바로 둘러보세요</p>
        </div>
        <Link
          href="/search"
          className="flex items-center gap-0.5 text-xs font-medium text-ink-faint transition-colors hover:text-brand-600"
        >
          전체보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {ordered.map((ga) => (
          <Link
            key={ga.id}
            href={`/search?ga=${ga.id}`}
            className="flex w-[92px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-line bg-surface-card px-2 py-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-500">
              {ga.logoUrl ? (
                <Image src={ga.logoUrl} alt={ga.name} width={44} height={44} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </span>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink-soft">{ga.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
