import Link from 'next/link';
import {
  MapPin,
  Users2,
  Sparkles,
  Footprints,
  Building2,
  Eye,
  PhoneCall,
  Briefcase,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  Globe,
  BadgeCheck,
  ShieldAlert,
  History,
  Flame,
} from 'lucide-react';
import { getDashboardStats } from '@/lib/admin/dashboard';
import { listRecentAuditLogs, formatAuditAction } from '@/lib/admin/audit';
import { StatCard } from '@/components/admin/StatCard';
import { GaApprovalActions } from '@/components/admin/GaApprovalActions';
import { PendingApprovalAlerts } from '@/components/admin/PendingApprovalAlerts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default async function AdminDashboardPage() {
  const [stats, auditLogs] = await Promise.all([getDashboardStats(), listRecentAuditLogs(10)]);
  const { todayNewBreakdown, plannerStats } = stats;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="text-sm text-muted-foreground">서비스 현황을 한눈에 확인하세요.</p>
      </div>

      <PendingApprovalAlerts counts={stats.pendingApprovalCounts} />

      {/* 메인 KPI - "등록"이라는 이름이어도 실제로 서비스에 반영된(승인/공개) 상태만 센다. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="등록 지점" value={stats.approvedBranchCount} icon={MapPin} />
        <StatCard label="등록 설계사" value={stats.registeredPlannerCount} icon={Users2} />
        <StatCard
          label="오늘 신규"
          value={stats.todayNewApprovedCount}
          icon={Sparkles}
          sublabel={`GA ${todayNewBreakdown.ga} · 지점 ${todayNewBreakdown.branch} · 설계사 ${todayNewBreakdown.planner}`}
        />
        <StatCard label="오늘 방문자" value={stats.todayVisitorCount} icon={Footprints} />
      </div>

      {/* 보조 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="승인된 GA" value={stats.approvedGaCount} icon={Building2} />
        <StatCard label="오늘 조회수" value={stats.todayViewCount} icon={Eye} />
        <StatCard label="오늘 문의 클릭수" value={stats.todayContactClickCount} icon={PhoneCall} />
        <StatCard label="진행중 채용공고" value={stats.activeRecruitCount} icon={Briefcase} />
        <StatCard label="최근 7일 문의" value={stats.last7DaysContactClickCount} icon={TrendingUp} />
      </div>

      {/* 설계사 통계 */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">설계사 통계</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="등록 설계사 수" value={plannerStats.registered} icon={UserPlus} />
          <StatCard label="승인 설계사 수" value={plannerStats.approved} icon={CheckCircle2} />
          <StatCard label="공개중 설계사 수" value={plannerStats.visible} icon={Globe} />
          <StatCard label="직전연봉 인증 설계사 수" value={plannerStats.incomeVerified} icon={BadgeCheck} />
          <StatCard label="오늘 신규 설계사" value={plannerStats.todayNew} icon={Sparkles} />
        </div>
      </div>

      {/* 미승인 GA 승인 큐 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            미승인 GA
            {stats.pendingGaList.length > 0 && <Badge variant="warning">{stats.pendingGaList.length}</Badge>}
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

      {/* 최근 활동 */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">최근 활동</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">최근 등록 GA</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {stats.recentGaList.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">승인된 GA가 없습니다.</p>
              ) : (
                stats.recentGaList.map((ga) => (
                  <Link
                    key={ga.id}
                    href={`/admin/ga/${ga.id}`}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 hover:opacity-70"
                  >
                    <p className="truncate text-sm font-medium">{ga.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ga.created_at), { addSuffix: true, locale: ko })}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">최근 등록 지점</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {stats.recentBranches.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">공개된 지점이 없습니다.</p>
              ) : (
                stats.recentBranches.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/branches/${b.id}`}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.gaCompanyName}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true, locale: ko })}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">최근 등록 설계사</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {stats.recentPlanners.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">공개된 설계사가 없습니다.</p>
              ) : (
                stats.recentPlanners.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/planner-market/${p.id}`}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.regionLabel} · 경력 {p.careerYears}년
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: ko })}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 인기 순위 (이번 달 조회수 기준) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">인기 순위 (이번 달 조회수 기준)</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Flame className="h-4 w-4 text-rose-500" />
              <CardTitle className="text-base">TOP5 인기 지점</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {stats.topBranches.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">이번 달 조회 데이터가 없습니다.</p>
              ) : (
                stats.topBranches.map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/admin/branches/${b.id}`}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 hover:opacity-70"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <p className="truncate text-sm font-medium">{b.name}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">조회 {b.viewCount}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Flame className="h-4 w-4 text-rose-500" />
              <CardTitle className="text-base">TOP5 인기 설계사</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {stats.topPlanners.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">이번 달 조회 데이터가 없습니다.</p>
              ) : (
                stats.topPlanners.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/admin/planner-market/${p.id}`}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 hover:opacity-70"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.regionLabel}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">조회 {p.viewCount}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-muted-foreground" />
            최근 관리자 활동
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">기록된 활동이 없습니다.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{log.adminName}</span>
                      <span className="text-muted-foreground"> · {formatAuditAction(log)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ko })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
