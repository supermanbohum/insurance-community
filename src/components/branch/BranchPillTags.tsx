import { BadgeCheck, MapPin, Building2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

function Pill({ icon: Icon, children }: { icon: typeof BadgeCheck; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-soft">
      <Icon className="h-3.5 w-3.5 text-brand-600" />
      {children}
    </span>
  );
}

export function BranchPillTags({
  isGaVerified,
  sidoName,
  sigunguName,
  gaBranchCount,
  updatedAt,
}: {
  isGaVerified: boolean;
  sidoName: string | null;
  sigunguName: string | null;
  gaBranchCount: number;
  updatedAt: string;
}) {
  const regionLabel = [sidoName, sigunguName].filter(Boolean).join(' ');

  return (
    <div className="flex flex-wrap gap-1.5">
      {isGaVerified && <Pill icon={BadgeCheck}>공식인증</Pill>}
      {regionLabel && <Pill icon={MapPin}>{regionLabel}</Pill>}
      <Pill icon={Building2}>전국 {gaBranchCount}개 지점</Pill>
      <Pill icon={RefreshCw}>{formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ko })} 업데이트</Pill>
    </div>
  );
}
