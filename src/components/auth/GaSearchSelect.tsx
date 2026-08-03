'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { cn } from '@/lib/utils';

/** 소속 GA 선택(검색형) - 회원가입/마이페이지/지점등록 전체가 공유하는 검색+자동완성
 * 콤보박스다. 회사 수가 늘어도 부담 없도록 이미 로드된 옵션 목록을 클라이언트에서
 * 필터링만 한다(별도 API 호출 없음). 마우스 클릭은 물론 방향키 이동 + Enter 선택도
 * 지원해 목록이 길어져도 키보드만으로 빠르게 고를 수 있다. */
export function GaSearchSelect({
  options,
  value,
  onChange,
  placeholder = 'GA명을 검색하세요',
}: {
  options: GaFilterOption[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options.slice(0, 30);
    return options.filter((o) => o.name.includes(q)).slice(0, 30);
  }, [options, query]);

  // 검색어가 바뀌어 목록이 달라지면 하이라이트를 항상 첫 항목으로 되돌린다.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  function selectOption(opt: GaFilterOption) {
    onChange(opt.id);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlightedIndex];
      if (opt) selectOption(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={open ? query : (selected?.name ?? '')}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>
      {open && (
        <div id={listboxId} ref={listRef} role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-card-hover">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-ink-faint">일치하는 GA가 없습니다.</p>
          ) : (
            filtered.map((opt, index) => (
              <button
                key={opt.id}
                type="button"
                data-index={index}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm',
                  index === highlightedIndex ? 'bg-surface-sunken' : 'hover:bg-surface-sunken',
                  opt.id === value && 'bg-brand-50 text-brand-700'
                )}
              >
                {opt.name}
                {opt.id === value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
