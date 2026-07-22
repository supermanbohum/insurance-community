'use client';

import { useRouter } from 'next/navigation';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'recommended', label: '관련도순' },
  { value: 'views', label: '조회순' },
  { value: 'newest', label: '최신순' },
];

export function SearchFilters({
  query,
  sort,
  region,
  regions,
}: {
  query: string;
  sort: string;
  region: string;
  regions: { sidoCode: string; sidoName: string }[];
}) {
  const router = useRouter();

  function updateParam(key: 'sort' | 'region', value: string) {
    const params = new URLSearchParams({ q: query });
    if (key === 'sort') {
      if (value !== 'recommended') params.set('sort', value);
      if (region) params.set('region', region);
    } else {
      if (sort !== 'recommended') params.set('sort', sort);
      if (value) params.set('region', value);
    }
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={region}
        onChange={(e) => updateParam('region', e.target.value)}
        className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft outline-none focus:border-brand-300"
      >
        <option value="">전체 지역</option>
        {regions.map((r) => (
          <option key={r.sidoCode} value={r.sidoCode}>
            {r.sidoName}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => updateParam('sort', e.target.value)}
        className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft outline-none focus:border-brand-300"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
