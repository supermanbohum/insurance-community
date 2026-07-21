import { Building2, Search } from 'lucide-react';
import { listPublicGaCompanies } from '@/lib/public/ga';
import { GaCard } from '@/components/ga/GaCard';

export const dynamic = 'force-dynamic';

export default async function GaListPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() || undefined;
  const list = await listPublicGaCompanies({ q });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">GA별 검색</h1>
        <p className="mt-1 text-sm text-ink-faint">전국 GA를 가나다순으로 찾아보세요.</p>
      </div>

      <form action="/ga" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="GA명 검색"
          className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-sm text-ink shadow-card outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:shadow-card-hover"
        />
      </form>

      {q && (
        <p className="text-xs text-ink-faint">
          <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span> 검색 결과{' '}
          <span className="font-semibold text-brand-600">{list.length}</span>건
        </p>
      )}

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-20 text-ink-faint">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken">
            <Building2 className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm">{q ? `'${q}'에 대한 검색 결과가 없습니다.` : '등록된 GA가 없습니다.'}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((ga, i) => (
            <li key={ga.id} className="stagger-item" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <GaCard ga={ga} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
