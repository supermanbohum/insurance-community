import { Building2, MapPinned, ShieldCheck } from 'lucide-react';
import { listPublicGaCompanies } from '@/lib/public/ga';
import { listPublicBranches } from '@/lib/public/branch';
import { countActiveInsurers } from '@/lib/public/insurer';

export async function PlatformStats() {
  const [gaCompanies, branches, insurerCount] = await Promise.all([
    listPublicGaCompanies({}),
    listPublicBranches({}),
    countActiveInsurers(),
  ]);

  const stats = [
    { icon: Building2, label: '등록 GA', value: `${gaCompanies.length.toLocaleString('ko-KR')}개사` },
    { icon: MapPinned, label: '운영 지점', value: `${branches.length.toLocaleString('ko-KR')}곳` },
    { icon: ShieldCheck, label: '제휴 보험사', value: `${insurerCount.toLocaleString('ko-KR')}개사` },
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
