'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Clock, TrendingUp, MapPin, Building2, X } from 'lucide-react';
import { getSearchSuggestionsAction, type SearchSuggestion } from '@/lib/actions/public';
import { addRecentSearch, getRecentSearches, removeRecentSearch } from '@/lib/search/recentSearches';
import { cn } from '@/lib/utils';

const POPULAR_KEYWORDS = ['인카금융서비스', '프라임에셋', '지에이코리아', '피플라이프'];

export function SearchCombobox({
  defaultValue = '',
  placeholder = '지역, GA명, 지점명 검색',
  autoFocus = false,
  inputClassName,
  iconClassName,
  basePath = '/search',
  onSelectResult,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName: string;
  iconClassName?: string;
  /** 검색 제출/최근·인기검색 클릭 시 이동할 경로. 지도 페이지 등에서 재사용할 때 지정한다. */
  basePath?: string;
  /** 지정하면 지점 결과 클릭 시 상세페이지로 이동하는 대신 이 콜백을 호출한다(지도 페이지: 마커로 이동+선택). */
  onSelectResult?: (suggestion: SearchSuggestion) => void;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
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

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setOpen(true);
  }

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  function commitSearch(keyword: string) {
    addRecentSearch(keyword);
  }

  function selectSuggestion(s: SearchSuggestion) {
    commitSearch(s.label);
    setOpen(false);
    if (onSelectResult) {
      onSelectResult(s);
    } else {
      window.location.href = s.href;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="search-combobox-listbox"
        className={inputClassName}
      />

      {open && (
        <div
          id="search-combobox-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-white p-3 text-left shadow-card-hover"
        >
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
            <p className="px-2 py-4 text-center text-xs text-ink-faint">일치하는 지점이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {suggestions.map((s, i) => {
                const Icon = s.type === 'region' ? MapPin : Building2;
                const content = (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-[13px] font-semibold text-ink">{s.label}</span>
                      <span className="truncate text-[11px] text-ink-faint">{s.sublabel}</span>
                    </span>
                  </>
                );
                const rowClassName = cn(
                  'flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors',
                  i === activeIndex ? 'bg-brand-50' : 'hover:bg-surface-sunken'
                );
                if (onSelectResult) {
                  return (
                    <button
                      key={`${s.type}-${s.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(s);
                      }}
                      className={rowClassName}
                    >
                      {content}
                    </button>
                  );
                }
                return (
                  <Link
                    key={`${s.type}-${s.id}`}
                    href={s.href}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={() => commitSearch(s.label)}
                    className={rowClassName}
                  >
                    {content}
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
