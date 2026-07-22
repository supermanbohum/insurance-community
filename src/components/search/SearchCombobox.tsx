'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Clock, TrendingUp, Building2, MapPin, X } from 'lucide-react';
import { getSearchSuggestionsAction, type SearchSuggestion } from '@/lib/actions/public';
import { addRecentSearch, getRecentSearches, removeRecentSearch } from '@/lib/search/recentSearches';
import { cn } from '@/lib/utils';

const POPULAR_KEYWORDS = ['맵그룹', '메리츠금융서비스', '프라임에셋', 'GA Korea'];

export function SearchCombobox({
  defaultValue = '',
  placeholder = '지역, GA명, 지점명 검색',
  autoFocus = false,
  inputClassName,
  iconClassName,
  navigateOnFocus = false,
  basePath = '/search',
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName: string;
  iconClassName?: string;
  /** true면 입력 대신 포커스 즉시 검색 페이지로 이동한다 (홈/헤더처럼 검색 페이지 진입 용도로만 쓰는 곳). */
  navigateOnFocus?: boolean;
  /** 검색 제출/최근·인기검색 클릭 시 이동할 경로. 지도 페이지 등에서 재사용할 때 지정한다. */
  basePath?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const result = await getSearchSuggestionsAction(trimmed);
      setSuggestions(result);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (navigateOnFocus) {
      e.target.blur();
      router.push(basePath);
      return;
    }
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setOpen(true);
  }

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  function commitSearch(keyword: string) {
    addRecentSearch(keyword);
  }

  const showRecentPanel = query.trim().length === 0;

  return (
    <form action={basePath} className="relative" onSubmit={() => commitSearch(query)}>
      <Search className={cn('pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint', iconClassName)} />
      <input
        type="text"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={inputClassName}
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-white p-3 text-left shadow-card-hover">
          {showRecentPanel ? (
            <>
              {recent.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-bold text-ink-soft">
                      <Clock className="h-3.5 w-3.5" />
                      최근 검색
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((keyword) => (
                      <span
                        key={keyword}
                        className="flex items-center gap-1 rounded-full border border-line bg-surface-sunken py-1 pl-3 pr-1.5 text-xs font-medium text-ink-soft"
                      >
                        <Link
                          href={`${basePath}?q=${encodeURIComponent(keyword)}`}
                          onMouseDown={() => commitSearch(keyword)}
                          className="hover:text-brand-600"
                        >
                          {keyword}
                        </Link>
                        <button
                          type="button"
                          aria-label={`${keyword} 최근 검색 삭제`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setRecent(removeRecentSearch(keyword));
                          }}
                          className="rounded-full p-0.5 text-ink-faint hover:bg-line hover:text-ink"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-ink-soft">
                  <TrendingUp className="h-3.5 w-3.5" />
                  인기 검색어
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_KEYWORDS.map((keyword, i) => (
                    <Link
                      key={keyword}
                      href={`${basePath}?q=${encodeURIComponent(keyword)}`}
                      onMouseDown={() => commitSearch(keyword)}
                      className="flex items-center gap-1 rounded-full border border-line bg-surface-sunken px-3 py-1 text-xs font-medium text-ink-soft hover:border-brand-200 hover:text-brand-600"
                    >
                      <span className="font-bold text-brand-500">{i + 1}</span>
                      {keyword}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          ) : loading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-sunken" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-surface-sunken" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-sunken" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-ink-faint">일치하는 GA/지점이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {suggestions.map((s) => {
                const Icon = s.type === 'ga' ? Building2 : MapPin;
                return (
                  <Link
                    key={`${s.type}-${s.id}`}
                    href={s.href}
                    onMouseDown={() => commitSearch(s.label)}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-sunken"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-[13px] font-semibold text-ink">{s.label}</span>
                      <span className="truncate text-[11px] text-ink-faint">{s.sublabel}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
