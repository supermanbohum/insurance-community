'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { cn } from '@/lib/utils';

/** 일반회원 가입/마이페이지의 "소속 GA 선택(검색형)" - 파트너용 GaSelect.tsx(평범한
 * 드롭다운)와 달리 텍스트로 필터링되는 콤보박스다. 회사 수가 늘어도 부담 없도록
 * 이미 로드된 옵션 목록을 클라이언트에서 필터링만 한다(별도 API 호출 없음). */
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

  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options.slice(0, 30);
    return options.filter((o) => o.name.includes(q)).slice(0, 30);
  }, [options, query]);

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
          placeholder={placeholder}
          autoComplete="off"
          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-card-hover">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-ink-faint">일치하는 GA가 없습니다.</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-sunken',
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
