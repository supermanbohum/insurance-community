import { Building2, MapPinned, RefreshCw } from 'lucide-react';
import { listPublicGaCompanies } from '@/lib/public/ga';
import { listPublicBranches } from '@/lib/public/branch';

export async function PlatformStats() {
  const [gaCompanies, branches] = await Promise.all([listPublicGaCompanies({}), listPublicBranches({})]);

  const stats = [
    { icon: Building2, label: '등록 GA', value: gaCompanies.length.toLocaleString('ko-KR') },
    { icon: MapPinned, label: '등록 지점', value: branches.length.toLocaleString('ko-KR') },
    { icon: RefreshCw, label: '업데이트', value: '매일' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface-card py-4 text-center shadow-card"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-base font-extrabold text-ink">{stat.value}</span>
            <span className="text-[11px] text-ink-faint">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
}
