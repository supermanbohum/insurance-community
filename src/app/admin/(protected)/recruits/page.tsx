import Link from 'next/link';
import { listAllRecruits } from '@/lib/admin/recruits';
import { RecruitCloseButton } from '@/components/admin/RecruitCloseButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS_TABS = [
  { value: undefined, label: '전체' },
  { value: 'active', label: '모집중' },
  { value: 'closed', label: '마감' },
] as const;

export default async function AdminRecruitsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status === 'active' || searchParams.status === 'closed' ? searchParams.status : undefined;
  const q = searchParams.q?.trim() || undefined;
  const recruits = await listAllRecruits({ status, q });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">채용 관리</h1>
        <p className="text-sm text-muted-foreground">전 지점의 공식채용 공고를 한 곳에서 확인하고 마감 처리합니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Link key={tab.label} href={tab.value ? `/admin/recruits?status=${tab.value}` : '/admin/recruits'}>
            <Button variant={status === tab.value ? 'default' : 'outline'} size="sm">
              {tab.label}
            </Button>
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-2" action="/admin/recruits">
          {status && <input type="hidden" name="status" value={status} />}
          <Input name="q" placeholder="채용 제목 검색" defaultValue={q} className="w-56" />
          <Button type="submit" variant="secondary" size="sm">
            검색
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>지점</TableHead>
                <TableHead>소속 GA</TableHead>
                <TableHead>고용형태</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    조건에 맞는 채용공고가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                recruits.map((recruit) => (
                  <TableRow key={recruit.id}>
                    <TableCell className="font-medium">{recruit.title}</TableCell>
                    <TableCell>
                      <Link href={`/admin/branches/${recruit.branchId}`} className="text-muted-foreground hover:underline">
                        {recruit.branchName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{recruit.gaCompanyName}</TableCell>
                    <TableCell className="text-muted-foreground">{recruit.employmentType ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={recruit.isActive ? 'success' : 'secondary'}>
                        {recruit.isActive ? '모집중' : '마감'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(recruit.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {recruit.isActive && <RecruitCloseButton recruitId={recruit.id} branchId={recruit.branchId} />}
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
