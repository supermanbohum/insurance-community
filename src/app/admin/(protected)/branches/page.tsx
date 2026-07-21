import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listBranches } from '@/lib/admin/branch';
import { APPROVAL_STATUS_LABEL } from '@/lib/admin/approval-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const BRANCH_STATUS_LABEL: Record<string, string> = {
  visible: '공개',
  hidden: '비공개',
};

export default async function AdminBranchListPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const branches = await listBranches({ q });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">지점 관리</h1>
          <p className="text-sm text-muted-foreground">지점을 생성하고 노출 상태를 관리합니다.</p>
        </div>
        <Link href="/admin/branches/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            지점 생성
          </Button>
        </Link>
      </div>

      <form className="flex items-center gap-2" action="/admin/branches">
        <Input name="q" placeholder="지점명 검색" defaultValue={q} className="w-64" />
        <Button type="submit" variant="secondary" size="sm">
          검색
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>지점명</TableHead>
                <TableHead>소속 GA</TableHead>
                <TableHead>지역</TableHead>
                <TableHead>공개 상태</TableHead>
                <TableHead>GA 승인 상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    조건에 맞는 지점이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <Link href={`/admin/branches/${branch.id}`} className="font-medium hover:underline">
                        {branch.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{branch.ga_company?.name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.region ? `${branch.region.sido_name} ${branch.region.sigungu_name ?? ''}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.status === 'visible' ? 'success' : 'secondary'}>
                        {BRANCH_STATUS_LABEL[branch.status] ?? branch.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.ga_company ? APPROVAL_STATUS_LABEL[branch.ga_company.approval_status as keyof typeof APPROVAL_STATUS_LABEL] : '-'}
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
