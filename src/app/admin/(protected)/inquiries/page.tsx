import { PhoneCall, CalendarDays, TrendingUp } from 'lucide-react';
import { getInquirySummary, listRecentContactClicks } from '@/lib/admin/inquiries';
import { StatCard } from '@/components/admin/StatCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CONTACT_TYPE_LABEL: Record<string, string> = {
  phone: '전화',
  phone_recruit: '채용문의 전화',
  kakao: '카카오톡',
  homepage: '홈페이지',
  instagram: '인스타그램',
  youtube: '유튜브',
  blog: '블로그',
};

export default async function AdminInquiriesPage() {
  const [summary, recentClicks] = await Promise.all([
    getInquirySummary(),
    listRecentContactClicks({ limit: 50 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">문의 관리</h1>
        <p className="text-sm text-muted-foreground">
          전화·카카오·홈페이지 등 연락 채널 클릭 현황입니다. (branch_contact_clicks 집계)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="누적 문의 클릭수" value={summary.totalCount} icon={PhoneCall} />
        <StatCard label="오늘 문의 클릭수" value={summary.todayCount} icon={TrendingUp} />
        <StatCard label="최근 7일" value={summary.last7DaysCount} icon={CalendarDays} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">채널별 비중 (최근 7일)</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.byType.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">최근 7일간 문의 클릭이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summary.byType.map((item) => (
                <Badge key={item.type} variant="secondary" className="gap-1.5 px-2.5 py-1">
                  {CONTACT_TYPE_LABEL[item.type] ?? item.type}
                  <span className="tabular-nums text-primary">{item.count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 문의 클릭</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>지점</TableHead>
                <TableHead>소속 GA</TableHead>
                <TableHead>채널</TableHead>
                <TableHead>시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentClicks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    문의 클릭 기록이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                recentClicks.map((click) => (
                  <TableRow key={click.id}>
                    <TableCell className="font-medium">{click.branchName}</TableCell>
                    <TableCell className="text-muted-foreground">{click.gaCompanyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{CONTACT_TYPE_LABEL[click.contactType] ?? click.contactType}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(click.createdAt).toLocaleString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
