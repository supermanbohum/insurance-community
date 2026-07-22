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
  gaIds,
  minPlanners,
  parking,
}: {
  query: string;
  sort: string;
  region: string;
  gaIds: string[];
  minPlanners: number;
  parking: string;
}) {
  const router = useRouter();

  function updateSort(value: string) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (value !== 'recommended') params.set('sort', value);
    if (region) params.set('region', region);
    if (gaIds.length > 0) params.set('ga', gaIds.join(','));
    if (minPlanners > 0) params.set('minPlanners', String(minPlanners));
    if (parking) params.set('parking', parking);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <select
      value={sort}
      onChange={(e) => updateSort(e.target.value)}
      className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft outline-none focus:border-brand-300"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
