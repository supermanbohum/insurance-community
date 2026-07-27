'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GripVertical, Eye, EyeOff, Lock, Unlock, Undo2, Redo2, RotateCcw, Save, Smartphone, Tablet, Monitor } from 'lucide-react';
import {
  getDefaultConfig,
  type Device,
  type PageKey,
  type SectionConfig,
  type SectionDef,
} from '@/lib/design/sections';
import { ResponsiveSection } from '@/components/shared/ResponsiveSection';
import { BranchDetailView } from '@/components/branch/BranchDetailView';
import type { BranchPreviewData } from '@/components/branch/types';
import { saveLayoutAction } from '@/lib/actions/design-admin';
import { PropertyPanel } from '@/components/admin/design/PropertyPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DeviceConfigMap = Record<Device, SectionConfig[]>;

const DEVICE_META: { device: Device; label: string; icon: typeof Smartphone; width: number | null }[] = [
  { device: 'mobile', label: '모바일', icon: Smartphone, width: 390 },
  { device: 'tablet', label: '태블릿', icon: Tablet, width: 768 },
  { device: 'desktop', label: 'PC', icon: Monitor, width: null },
];

function sortedByOrder(sections: SectionConfig[]): SectionConfig[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

function reorder(sections: SectionConfig[], fromKey: string, toKey: string): SectionConfig[] {
  const sorted = sortedByOrder(sections);
  const fromIndex = sorted.findIndex((s) => s.key === fromKey);
  const toIndex = sorted.findIndex((s) => s.key === toKey);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return sections;
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);
  return sorted.map((s, index) => ({ ...s, order: index }));
}

type Preview =
  | { kind: 'sections'; nodes: { key: string; node: React.ReactNode }[] }
  | { kind: 'branch'; data: BranchPreviewData | null };

export function DesignEditor({
  pageKey,
  sectionDefs,
  initialConfig,
  preview,
}: {
  pageKey: PageKey;
  sectionDefs: SectionDef[];
  initialConfig: DeviceConfigMap;
  preview: Preview;
}) {
  const [activeDevice, setActiveDevice] = useState<Device>('mobile');
  const [history, setHistory] = useState<DeviceConfigMap[]>([initialConfig]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const config = history[historyIndex];
  const activeSections = sortedByOrder(config[activeDevice]);
  const selectedDef = sectionDefs.find((d) => d.key === selectedKey);
  const selectedConfig = config[activeDevice].find((s) => s.key === selectedKey);

  function commit(nextDeviceSections: SectionConfig[]) {
    const next: DeviceConfigMap = { ...config, [activeDevice]: nextDeviceSections };
    const truncated = history.slice(0, historyIndex + 1);
    setHistory([...truncated, next]);
    setHistoryIndex(truncated.length);
  }

  function updateSelected(patch: Partial<SectionConfig>) {
    if (!selectedKey) return;
    commit(config[activeDevice].map((s) => (s.key === selectedKey ? { ...s, ...patch } : s)));
  }

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    commit(reorder(config[activeDevice], dragKey, targetKey));
    setDragKey(null);
  }

  function handleUndo() {
    setHistoryIndex((i) => Math.max(0, i - 1));
  }

  function handleRedo() {
    setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
  }

  function handleReset() {
    commit(getDefaultConfig(pageKey));
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveLayoutAction(pageKey, activeDevice, config[activeDevice]);
    setSaving(false);
    if (result.success) {
      toast.success(`${DEVICE_META.find((d) => d.device === activeDevice)?.label} 레이아웃을 저장했습니다.`);
    } else {
      toast.error(result.error);
    }
  }

  const previewWidth = DEVICE_META.find((d) => d.device === activeDevice)?.width;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-1 rounded-md border p-1">
          {DEVICE_META.map(({ device, label, icon: Icon }) => (
            <button
              key={device}
              type="button"
              onClick={() => setActiveDevice(device)}
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors',
                activeDevice === device ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex === 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex === history.length - 1}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            초기화
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? '저장 중...' : `${DEVICE_META.find((d) => d.device === activeDevice)?.label} 저장`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_300px]">
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-2">
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">섹션 순서 (드래그로 이동)</p>
          {activeSections.map((s) => {
            const def = sectionDefs.find((d) => d.key === s.key);
            return (
              <div
                key={s.key}
                draggable={!s.locked}
                onDragStart={() => setDragKey(s.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(s.key)}
                onClick={() => setSelectedKey(s.key)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors',
                  selectedKey === s.key ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
                  !s.visible && 'opacity-50'
                )}
              >
                <GripVertical className={cn('h-4 w-4 shrink-0', s.locked ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
                <span className="min-w-0 flex-1 truncate">{def?.label ?? s.key}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    commit(config[activeDevice].map((x) => (x.key === s.key ? { ...x, visible: !x.visible } : x)));
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    commit(config[activeDevice].map((x) => (x.key === s.key ? { ...x, locked: !x.locked } : x)));
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {s.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center overflow-x-auto rounded-lg border bg-muted/30 p-4">
          <div
            className="min-h-[400px] w-full bg-white shadow-sm"
            style={previewWidth ? { maxWidth: previewWidth } : undefined}
          >
            {preview.kind === 'branch' ? (
              preview.data ? (
                <div className="p-4">
                  <BranchDetailView data={preview.data} variant="preview" layoutConfig={config} />
                </div>
              ) : (
                <div className="flex h-full min-h-[400px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  미리보기에 사용할 지점이 없습니다. 지점이 하나 이상 등록되면 여기에 실제 데이터로 표시됩니다.
                </div>
              )
            ) : (
              <div className="flex flex-col p-4">
                {preview.nodes.map(({ key, node }) => (
                  <ResponsiveSection
                    key={key}
                    sectionKey={key}
                    config={{
                      mobile: config.mobile.find((s) => s.key === key),
                      tablet: config.tablet.find((s) => s.key === key),
                      desktop: config.desktop.find((s) => s.key === key),
                    }}
                  >
                    {node}
                  </ResponsiveSection>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <PropertyPanel def={selectedDef} config={selectedConfig} onChange={updateSelected} />
        </div>
      </div>
    </div>
  );
}
