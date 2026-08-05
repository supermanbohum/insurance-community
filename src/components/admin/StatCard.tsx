import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'default' | 'warning';
  /** 값 아래에 작게 덧붙이는 부가 설명(예: "GA 1 · 지점 2 · 설계사 4"). */
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            accent === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {sublabel && <p className="truncate text-[11px] text-muted-foreground">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
