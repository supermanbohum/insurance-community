'use client';

import type { SectionConfig, SectionDef } from '@/lib/design/sections';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function PropertyPanel({
  def,
  config,
  onChange,
}: {
  def: SectionDef | undefined;
  config: SectionConfig | undefined;
  onChange: (patch: Partial<SectionConfig>) => void;
}) {
  if (!def || !config) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        왼쪽 목록에서 섹션을 선택하세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <h3 className="text-sm font-bold">{def.label}</h3>

      <div className="flex items-center justify-between">
        <Label htmlFor="prop-visible">노출</Label>
        <Switch id="prop-visible" checked={config.visible} onCheckedChange={(v) => onChange({ visible: v })} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="prop-locked">위치 잠금</Label>
        <Switch id="prop-locked" checked={config.locked} onCheckedChange={(v) => onChange({ locked: v })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="flex items-center justify-between">
          <span>위 여백</span>
          <span className="text-xs text-muted-foreground">{config.marginTop}px</span>
        </Label>
        <input
          type="range"
          min={0}
          max={80}
          step={4}
          value={config.marginTop}
          onChange={(e) => onChange({ marginTop: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="flex items-center justify-between">
          <span>아래 여백</span>
          <span className="text-xs text-muted-foreground">{config.marginBottom}px</span>
        </Label>
        <input
          type="range"
          min={0}
          max={80}
          step={4}
          value={config.marginBottom}
          onChange={(e) => onChange({ marginBottom: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {def.textFields && def.textFields.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-3">
          {def.textFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`prop-text-${field.key}`}>{field.label}</Label>
              <Input
                id={`prop-text-${field.key}`}
                value={config.text?.[field.key] ?? field.default}
                onChange={(e) => onChange({ text: { ...config.text, [field.key]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
