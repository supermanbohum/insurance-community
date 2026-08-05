'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { searchGaCompaniesForCreditGrantAction } from '@/lib/actions/planner-market-admin';
import type { GaCompanySearchResult } from '@/lib/admin/planner-market-credits';
import { Input } from '@/components/ui/input';
import { APPROVAL_STATUS_LABEL } from '@/lib/admin/approval-status';
import type { GaApprovalStatus } from '@/types/database';

/** GA사 이름으로 검색해 선택하면 ?company=ID 쿼리스트링으로 이동한다(서버 컴포넌트가
 * 그 값을 읽어 지급 패널/이력을 렌더링) - SearchCombobox와 동일한 디바운스 패턴. */
export function GaCompanyCreditSearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GaCompanySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const data = await searchGaCompaniesForCreditGrantAction(trimmed);
      setResults(data);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function select(id: string) {
    setOpen(false);
    setQuery('');
    router.push(`/admin/planner-market/credits?company=${id}`);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="GA사 이름으로 검색"
        className="pl-9"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">일치하는 GA사가 없습니다.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(r.id);
                }}
                className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {APPROVAL_STATUS_LABEL[r.approvalStatus as GaApprovalStatus] ?? r.approvalStatus}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
