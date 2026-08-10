'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchBranchesForRegistrationAction } from '@/lib/actions/branch-planner-registrations';
import type { BranchSearchResultLite } from '@/lib/public/branch';

/** ③ ⓑ 폼의 지점 검색 - TopPlannerApplicationForm의 "본인 지점 검색" 인라인 UI를
 * 공용 컴포넌트로 뽑았다(동일 패턴 재사용, searchApprovedBranchesLite 기반). 찾는
 * 지점이 없으면 onNotFound로 알려 하드 게이트 화면을 띄운다. */
export function BranchSearchField({
  value,
  onChange,
  onNotFound,
}: {
  value: BranchSearchResultLite | null;
  onChange: (branch: BranchSearchResultLite | null) => void;
  onNotFound?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BranchSearchResultLite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedNotFoundRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchBranchesForRegistrationAction(trimmed);
      setResults(found);
      setLoading(false);
      if (found.length === 0 && !notifiedNotFoundRef.current) {
        notifiedNotFoundRef.current = true;
        onNotFound?.();
      }
      if (found.length > 0) notifiedNotFoundRef.current = false;
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onNotFound]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{value.name}</p>
          <p className="truncate text-xs text-ink-faint">
            {value.gaCompanyName}
            {value.sidoName && ` · ${value.sidoName}${value.sigunguName ? ` ${value.sigunguName}` : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery('');
          }}
          className="shrink-0 rounded-full p-1.5 text-ink-faint hover:bg-white"
          aria-label="지점 선택 변경"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="지점명 / 지역 / GA명을 입력하세요"
        autoComplete="off"
        className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-card-hover">
          {loading ? (
            <p className="px-3 py-3 text-center text-xs text-ink-faint">검색 중...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-ink-faint">일치하는 지점이 없습니다.</p>
          ) : (
            results.map((b) => (
              <button
                key={b.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(b);
                  setOpen(false);
                }}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-surface-sunken"
              >
                <span className="truncate text-sm font-semibold text-ink">{b.name}</span>
                <span className="truncate text-xs text-ink-faint">
                  {b.gaCompanyName}
                  {b.sidoName && ` · ${b.sidoName}${b.sigunguName ? ` ${b.sigunguName}` : ''}`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
