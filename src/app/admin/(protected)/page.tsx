import Link from 'next/link';
import { Building2, MapPin, Sparkles, Eye, PhoneCall, ShieldAlert } from 'lucide-react';
import { getDashboardStats } from '@/lib/admin/dashboard';
import { StatCard } from '@/components/admin/StatCard';
import { GaApprovalActions } from '@/components/admin/GaApprovalActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APPROVAL_STATUS_BADGE_VARIANT, APPROVAL_STATUS_LABEL } from '@/lib/admin/approval-status';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="text-sm text-muted-foreground">서비스 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="등록된 GA 수" value={stats.totalGaCount} icon={Building2} />
        <StatCard label="등록된 지점 수" value={stats.totalBranchCount} icon={MapPin} />
        <StatCard label="오늘 신규 등록" value={stats.todayNewCount} icon={Sparkles} />
        <StatCard label="오늘 조회수" value={stats.todayViewCount} icon={Eye} />
        <StatCard label="오늘 문의 클릭수" value={stats.todayContactClickCount} icon={PhoneCall} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              미승인 GA
              {stats.pendingGaList.length > 0 && (
                <Badge variant="warning">{stats.pendingGaList.length}</Badge>
              )}
            </CardTitle>
            <Link href="/admin/ga?status=pending" className="text-xs text-primary hover:underline">
              전체보기
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats.pendingGaList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">심사 대기 중인 GA가 없습니다.</p>
            ) : (
              stats.pendingGaList.map((ga) => (
                <div key={ga.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ga.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ga.created_at), { addSuffix: true, locale: ko })} 등록
                    </p>
                  </div>
                  <GaApprovalActions gaCompanyId={ga.id} gaName={ga.name} status={ga.approval_status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">최근 등록 GA</CardTitle>
            <Link href="/admin/ga" className="text-xs text-primary hover:underline">
              전체보기
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats.recentGaList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">등록된 GA가 없습니다.</p>
            ) : (
              stats.recentGaList.map((ga) => (
                <Link
                  key={ga.id}
                  href={`/admin/ga/${ga.id}`}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 hover:opacity-70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ga.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ga.created_at), { addSuffix: true, locale: ko })}
                    </p>
                  </div>
                  <Badge variant={APPROVAL_STATUS_BADGE_VARIANT[ga.approval_status]}>
                    {APPROVAL_STATUS_LABEL[ga.approval_status]}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
