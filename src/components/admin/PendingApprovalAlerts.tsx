import Link from 'next/link';
import type { PendingApprovalCounts } from '@/lib/admin/dashboard';

const ALERT_CONFIG: { key: keyof PendingApprovalCounts; label: string; href: string }[] = [
  { key: 'ga', label: '신규 GA 승인요청', href: '/admin/ga?status=pending' },
  { key: 'branchCreate', label: '신규 지점 승인요청', href: '/admin/change-requests' },
  { key: 'planner', label: '신규 설계사 승인요청', href: '/admin/planner-market' },
  // 주체는 지점 관리자지만(운영팀은 예비 경로) 대기가 쌓이는 것 자체는 운영팀이 알아야 한다.
  { key: 'plannerLink', label: '설계사 지점 연결 심사', href: '/admin/planner-links' },
];

/** 로그인 시 바로 눈에 띄어야 하는 승인 대기 알림 - 0건인 항목은 굳이 보여줄 필요가
 * 없으니 숨긴다. 전부 0건이면 섹션 자체를 렌더링하지 않는다(호출부에서 처리). */
export function PendingApprovalAlerts({ counts }: { counts: PendingApprovalCounts }) {
  const alerts = ALERT_CONFIG.filter((a) => counts[a.key] > 0);
  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {alerts.map((a) => (
        <Link
          key={a.key}
          href={a.href}
          className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
        >
          <span aria-hidden>🔴</span>
          <span className="flex-1">{a.label}</span>
          <span className="tabular-nums">{counts[a.key]}건</span>
        </Link>
      ))}
    </div>
  );
}
