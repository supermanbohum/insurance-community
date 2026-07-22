import Link from 'next/link';
import { X } from 'lucide-react';

export interface FilterChip {
  key: string;
  label: string;
  href: string;
}

export function SearchFilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-2 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-300"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </Link>
      ))}
    </div>
  );
}
