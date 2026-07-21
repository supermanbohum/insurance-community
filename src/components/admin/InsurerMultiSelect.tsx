'use client';

import type { InsurerRow } from '@/lib/admin/branch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function InsurerMultiSelect({
  insurers,
  selectedIds,
  onChange,
}: {
  insurers: InsurerRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((v) => v !== id));
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {insurers.map((insurer) => {
        const checked = selectedIds.includes(insurer.id);
        return (
          <label
            key={insurer.id}
            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm has-[[data-state=checked]]:border-primary"
          >
            <Checkbox checked={checked} onCheckedChange={(v) => toggle(insurer.id, v === true)} />
            <Label className="cursor-pointer font-normal">{insurer.name}</Label>
          </label>
        );
      })}
    </div>
  );
}
